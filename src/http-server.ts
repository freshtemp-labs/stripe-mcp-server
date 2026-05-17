import express, { type Request, type Response } from "express";
import { createServer as createMcpServer } from "./server.js";
import { initStripeClient } from "./stripe-client.js";
import type { StripeMCPConfig } from "./types.js";
import { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

/**
 * Create and start an HTTP MCP server using Server-Sent Events (SSE).
 * This allows MCP clients to connect via HTTP instead of stdio.
 */
export async function createHttpServer(config: StripeMCPConfig) {
  const stripe = initStripeClient(config);
  const port = config.port || 3100;

  const app = express();

  // Parse JSON bodies (except the MCP endpoint which needs raw body for signature)
  app.use((req, res, next) => {
    if (req.path === "/webhook") {
      next();
    } else {
      express.json()(req, res, next);
    }
  });

  app.use((req, res, next) => {
    // Skip raw body parsing for webhook
    if (req.path === "/webhook") {
      express.raw({ type: "application/json" })(req, res, next);
      return;
    }
    next();
  });

  // ─── Health check ──────────────────────────────────────────────

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      server: "stripe-mcp-server",
      version: "1.0.0",
      mode: config.secretKey.startsWith("sk_live_") ? "live" : "test",
    });
  });

  // ─── MCP Streamable HTTP endpoint ──────────────────────────────
  // The MCP SDK handles the full Streamable HTTP protocol (session init, tool list, tool calls, notifications)

  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless — no session persistence
      });

      const server = createMcpServer();

      // Set up the transport to handle each request/response cycle
      res.on("close", () => transport.close());

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err: any) {
      console.error(`[http] MCP error: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // ─── Direct Stripe webhook receiver ────────────────────────────

  app.post("/webhook", async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = config.webhookSecret;

    if (!webhookSecret) {
      res.status(501).json({
        error:
          "Webhook secret not configured. Set STRIPE_WEBHOOK_SECRET for premium webhook support.",
      });
      return;
    }

    if (!sig) {
      res.status(400).json({ error: "Missing Stripe-Signature header" });
      return;
    }

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );

      console.error(
        `[webhook] Received event: ${event.type} (${event.id})`
      );

      res.json({
        received: true,
        type: event.type,
        id: event.id,
      });
    } catch (err: any) {
      console.error(`[webhook] Verification failed: ${err.message}`);
      res.status(400).json({
        error: `Webhook signature verification failed: ${err.message}`,
      });
    }
  });

  // ─── Tools list (REST-friendly) ────────────────────────────────

  app.get("/tools", (_req: Request, res: Response) => {
    const mcpServer = createMcpServer();
    // We serve the tool list directly since we know it
    res.json({
      server: "stripe-mcp-server",
      version: "1.0.0",
      tools: [
        "create_payment_intent",
        "retrieve_payment_intent",
        "confirm_payment_intent",
        "cancel_payment_intent",
        "create_refund",
        "list_payment_intents",
        "create_customer",
        "retrieve_customer",
        "update_customer",
        "delete_customer",
        "list_customers",
        "create_subscription",
        "retrieve_subscription",
        "update_subscription",
        "cancel_subscription",
        "list_subscriptions",
        "retrieve_balance",
        "list_balance_transactions",
        "construct_webhook_event",
        "list_webhook_endpoints",
        "create_webhook_endpoint",
        "delete_webhook_endpoint",
      ],
    });
  });

  // ─── Start ─────────────────────────────────────────────────────

  app.listen(port, () => {
    console.error(`[stripe-mcp-server] HTTP server listening on port ${port}`);
    console.error(`[stripe-mcp-server] MCP endpoint: POST http://localhost:${port}/mcp`);
    console.error(`[stripe-mcp-server] Webhook receiver: POST http://localhost:${port}/webhook`);
    console.error(`[stripe-mcp-server] Health: GET http://localhost:${port}/health`);
  });

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.error("\n[stripe-mcp-server] Shutting down...");
    process.exit(0);
  });
}
