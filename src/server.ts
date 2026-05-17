import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { initStripeClient } from "./stripe-client.js";
import { SERVER_INFO, type StripeMCPConfig } from "./types.js";
import {
  createPaymentIntent,
  retrievePaymentIntent,
  confirmPaymentIntent,
  cancelPaymentIntent,
  createRefund,
  listPaymentIntents,
} from "./tools/payments.js";
import {
  createCustomer,
  retrieveCustomer,
  updateCustomer,
  deleteCustomer,
  listCustomers,
} from "./tools/customers.js";
import {
  createSubscription,
  retrieveSubscription,
  updateSubscription,
  cancelSubscription,
  listSubscriptions,
} from "./tools/subscriptions.js";
import { retrieveBalance, listBalanceTransactions } from "./tools/balance.js";
import {
  constructWebhookEvent,
  listWebhookEndpoints,
  createWebhookEndpoint,
  deleteWebhookEndpoint,
} from "./tools/webhooks.js";

// ─── Tool definitions ────────────────────────────────────────────

const TOOLS = [
  {
    name: "create_payment_intent",
    description:
      "Create a Stripe PaymentIntent to accept a payment. Returns client_secret for client-side confirmation.",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount in cents (e.g., 2000 for $20.00)" },
        currency: { type: "string", description: "Three-letter ISO currency code (e.g., 'usd')", default: "usd" },
        customer: { type: "string", description: "Stripe customer ID (starts with cus_)" },
        description: { type: "string", description: "Description of the payment" },
        metadata: { type: "object", description: "Key-value metadata" },
        receipt_email: { type: "string", description: "Email for the receipt" },
      },
      required: ["amount"],
    },
  },
  {
    name: "retrieve_payment_intent",
    description: "Retrieve a PaymentIntent by ID to check its status and details.",
    inputSchema: {
      type: "object",
      properties: {
        payment_intent_id: { type: "string", description: "PaymentIntent ID (starts with pi_)" },
      },
      required: ["payment_intent_id"],
    },
  },
  {
    name: "confirm_payment_intent",
    description: "Confirm a PaymentIntent for manual confirmation flows.",
    inputSchema: {
      type: "object",
      properties: {
        payment_intent_id: { type: "string", description: "PaymentIntent ID" },
        payment_method: { type: "string", description: "PaymentMethod ID (starts with pm_)" },
        return_url: { type: "string", description: "URL to return to after confirmation" },
      },
      required: ["payment_intent_id"],
    },
  },
  {
    name: "cancel_payment_intent",
    description: "Cancel a PaymentIntent that hasn't been completed.",
    inputSchema: {
      type: "object",
      properties: {
        payment_intent_id: { type: "string", description: "PaymentIntent ID" },
      },
      required: ["payment_intent_id"],
    },
  },
  {
    name: "create_refund",
    description: "Issue a refund for a completed payment.",
    inputSchema: {
      type: "object",
      properties: {
        payment_intent_id: { type: "string", description: "PaymentIntent ID to refund" },
        amount: { type: "number", description: "Amount to refund in cents (omit for full refund)" },
        reason: {
          type: "string",
          enum: ["duplicate", "fraudulent", "requested_by_customer"],
        },
      },
      required: ["payment_intent_id"],
    },
  },
  {
    name: "list_payment_intents",
    description: "List PaymentIntents, optionally filtered by customer.",
    inputSchema: {
      type: "object",
      properties: {
        customer: { type: "string", description: "Filter by customer ID" },
        limit: { type: "number", description: "Number to return (1-100, default 10)" },
      },
    },
  },
  // ─── Customers ─────────────────────────────────────────────────
  {
    name: "create_customer",
    description: "Create a new Stripe customer.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Customer email" },
        name: { type: "string", description: "Customer name" },
        description: { type: "string", description: "Description" },
        metadata: { type: "object", description: "Key-value metadata" },
      },
    },
  },
  {
    name: "retrieve_customer",
    description: "Retrieve a customer by ID.",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: { type: "string", description: "Customer ID (starts with cus_)" },
      },
      required: ["customer_id"],
    },
  },
  {
    name: "update_customer",
    description: "Update a customer's information.",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: { type: "string", description: "Customer ID" },
        email: { type: "string", description: "New email" },
        name: { type: "string", description: "New name" },
        description: { type: "string", description: "New description" },
        metadata: { type: "object", description: "Key-value metadata" },
      },
      required: ["customer_id"],
    },
  },
  {
    name: "delete_customer",
    description: "Delete a customer.",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: { type: "string", description: "Customer ID" },
      },
      required: ["customer_id"],
    },
  },
  {
    name: "list_customers",
    description: "List customers, optionally filtered by email.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Filter by email" },
        limit: { type: "number", description: "Number to return (1-100, default 10)" },
      },
    },
  },
  // ─── Subscriptions ─────────────────────────────────────────────
  {
    name: "create_subscription",
    description:
      "Create a new subscription for a customer with one or more price items.",
    inputSchema: {
      type: "object",
      properties: {
        customer: { type: "string", description: "Customer ID (starts with cus_)" },
        items: {
          type: "array",
          description: "Array of price items",
          items: {
            type: "object",
            properties: {
              price: { type: "string", description: "Stripe Price ID (starts with price_)" },
              quantity: { type: "number", description: "Quantity (default 1)" },
            },
            required: ["price"],
          },
        },
        coupon: { type: "string", description: "Coupon ID to apply" },
        trial_period_days: { type: "number", description: "Number of trial days" },
        metadata: { type: "object", description: "Key-value metadata" },
        cancel_at_period_end: { type: "boolean", description: "Cancel at end of billing period" },
      },
      required: ["customer", "items"],
    },
  },
  {
    name: "retrieve_subscription",
    description: "Retrieve a subscription by ID.",
    inputSchema: {
      type: "object",
      properties: {
        subscription_id: { type: "string", description: "Subscription ID (starts with sub_)" },
      },
      required: ["subscription_id"],
    },
  },
  {
    name: "update_subscription",
    description: "Update a subscription (change items, coupon, cancel behavior).",
    inputSchema: {
      type: "object",
      properties: {
        subscription_id: { type: "string", description: "Subscription ID" },
        cancel_at_period_end: { type: "boolean" },
        coupon: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Subscription item ID to update" },
              price: { type: "string", description: "New price ID" },
              quantity: { type: "number" },
              deleted: { type: "boolean", description: "Set true to remove this item" },
            },
          },
        },
        metadata: { type: "object" },
      },
      required: ["subscription_id"],
    },
  },
  {
    name: "cancel_subscription",
    description: "Cancel a subscription.",
    inputSchema: {
      type: "object",
      properties: {
        subscription_id: { type: "string", description: "Subscription ID" },
        invoice_now: { type: "boolean", description: "Generate final invoice immediately" },
        prorate: { type: "boolean", description: "Prorate the cancellation" },
      },
      required: ["subscription_id"],
    },
  },
  {
    name: "list_subscriptions",
    description: "List subscriptions, optionally filtered by customer or status.",
    inputSchema: {
      type: "object",
      properties: {
        customer: { type: "string", description: "Filter by customer" },
        status: {
          type: "string",
          enum: ["active", "past_due", "unpaid", "canceled", "incomplete", "trialing"],
        },
        limit: { type: "number", description: "Number to return (1-100, default 10)" },
      },
    },
  },
  // ─── Balance ───────────────────────────────────────────────────
  {
    name: "retrieve_balance",
    description:
      "Get your Stripe account balance (available, pending, and instant amounts).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_balance_transactions",
    description: "List balance transactions (fees, charges, payouts, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "Filter by transaction type (charge, refund, payout, etc.)",
        },
        limit: { type: "number", description: "Number to return (1-100, default 10)" },
      },
    },
  },
  // ─── Webhooks (Premium) ────────────────────────────────────────
  {
    name: "construct_webhook_event",
    description:
      "Verify and construct a Stripe webhook event from raw payload and signature header. PREMIUM FEATURE.",
    inputSchema: {
      type: "object",
      properties: {
        payload: {
          type: "string",
          description: "Raw request body as a string",
        },
        signature: {
          type: "string",
          description: "Stripe-Signature header value",
        },
      },
      required: ["payload", "signature"],
    },
  },
  {
    name: "list_webhook_endpoints",
    description:
      "List configured webhook endpoints. PREMIUM FEATURE.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number to return (1-100, default 10)" },
      },
    },
  },
  {
    name: "create_webhook_endpoint",
    description:
      "Create a new webhook endpoint. Returns the signing secret — save it! PREMIUM FEATURE.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "HTTPS URL to receive events" },
        enabled_events: {
          type: "array",
          description: "Event types to receive",
          items: { type: "string" },
        },
        description: { type: "string", description: "Description of this endpoint" },
      },
      required: ["url", "enabled_events"],
    },
  },
  {
    name: "delete_webhook_endpoint",
    description: "Delete a webhook endpoint. PREMIUM FEATURE.",
    inputSchema: {
      type: "object",
      properties: {
        webhook_endpoint_id: {
          type: "string",
          description: "Webhook endpoint ID (starts with we_)",
        },
      },
      required: ["webhook_endpoint_id"],
    },
  },
];

// ─── Tool router ─────────────────────────────────────────────────

async function handleToolCall(request: CallToolRequest) {
  const { name, arguments: args } = request.params;

  switch (name) {
    // Payments
    case "create_payment_intent":
      return await createPaymentIntent(args as any);
    case "retrieve_payment_intent":
      return await retrievePaymentIntent(args as any);
    case "confirm_payment_intent":
      return await confirmPaymentIntent(args as any);
    case "cancel_payment_intent":
      return await cancelPaymentIntent(args as any);
    case "create_refund":
      return await createRefund(args as any);
    case "list_payment_intents":
      return await listPaymentIntents(args as any);
    // Customers
    case "create_customer":
      return await createCustomer(args as any);
    case "retrieve_customer":
      return await retrieveCustomer(args as any);
    case "update_customer":
      return await updateCustomer(args as any);
    case "delete_customer":
      return await deleteCustomer(args as any);
    case "list_customers":
      return await listCustomers(args as any);
    // Subscriptions
    case "create_subscription":
      return await createSubscription(args as any);
    case "retrieve_subscription":
      return await retrieveSubscription(args as any);
    case "update_subscription":
      return await updateSubscription(args as any);
    case "cancel_subscription":
      return await cancelSubscription(args as any);
    case "list_subscriptions":
      return await listSubscriptions(args as any);
    // Balance
    case "retrieve_balance":
      return await retrieveBalance();
    case "list_balance_transactions":
      return await listBalanceTransactions(args as any);
    // Webhooks (Premium)
    case "construct_webhook_event":
      return await constructWebhookEvent(args as any);
    case "list_webhook_endpoints":
      return await listWebhookEndpoints(args as any);
    case "create_webhook_endpoint":
      return await createWebhookEndpoint(args as any);
    case "delete_webhook_endpoint":
      return await deleteWebhookEndpoint(args as any);
    default:
      return {
        success: false,
        error: `Unknown tool: ${name}`,
      };
  }
}

// ─── Server factory ──────────────────────────────────────────────

/**
 * Create and configure the MCP server with all Stripe tools.
 */
export function createServer() {
  const server = new Server(SERVER_INFO, {
    capabilities: {
      tools: {},
    },
  });

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const result = await handleToolCall(request);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  });

  return server;
}

// ─── Start (stdio mode) ──────────────────────────────────────────

/**
 * Start the MCP server in stdio mode (default).
 */
export async function startStdio(config: StripeMCPConfig) {
  initStripeClient(config);

  const server = createServer();
  const transport = new StdioServerTransport();

  console.error(`[stripe-mcp-server] Starting in stdio mode`);
  console.error(`[stripe-mcp-server] Tools: ${TOOLS.length} registered`);

  await server.connect(transport);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.error("[stripe-mcp-server] Shutting down...");
    await server.close();
    process.exit(0);
  });
}
