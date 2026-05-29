#!/usr/bin/env node

import { startStdio } from "./server.js";
import { createHttpServer } from "./http-server.js";
import type { StripeMCPConfig } from "./types.js";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const PORT = parseInt(process.env.PORT || "3100", 10);

function printBanner() {
  const banner = `
╔══════════════════════════════════════════╗
║     🏦  Stripe MCP Server v1.0.0         ║
║     Premium Stripe integration for MCP   ║
║     github.com/freshtemp-labs            ║
╚══════════════════════════════════════════╝
`;
  console.error(banner);
}

function printConfig(config: StripeMCPConfig) {
  const mode = config.secretKey.startsWith("sk_live_") ? "LIVE" : "TEST";
  console.error(`  Mode:              ${mode}`);
  console.error(
    `  Transport:         ${config.transport || "stdio"}`
  );
  if (config.transport === "http") {
    console.error(`  Port:              ${config.port || 3100}`);
  }
  console.error(
    `  Webhook secret:    ${config.webhookSecret ? "✓ configured" : "✗ not set (premium feature)"}`
  );
  console.error("");
}

const args = process.argv.slice(2);
const httpMode = args.includes("--http") || args.includes("-h") && !args[0]?.startsWith("-");

async function main() {
  printBanner();

  if (!STRIPE_SECRET_KEY) {
    console.error(
      "ERROR: STRIPE_SECRET_KEY environment variable is required.\n"
    );
    console.error(
      "Get your keys from: https://dashboard.stripe.com/apikeys\n"
    );
    console.error(
      `Usage: STRIPE_SECRET_KEY=sk_test_... npx stripe-mcp-server`
    );
    process.exit(1);
  }

  if (!STRIPE_SECRET_KEY.startsWith("sk_")) {
    console.error(
      "ERROR: STRIPE_SECRET_KEY must start with 'sk_' (secret key).\n"
    );
    console.error(
      "Publishable keys (pk_) cannot be used for server-side operations."
    );
    process.exit(1);
  }

  const config: StripeMCPConfig = {
    secretKey: STRIPE_SECRET_KEY,
    webhookSecret: STRIPE_WEBHOOK_SECRET,
    transport: httpMode ? "http" : "stdio",
    port: PORT,
  };

  printConfig(config);

  if (config.transport === "http") {
    await createHttpServer(config);
  } else {
    await startStdio(config);
  }
}

main().catch((err) => {
  console.error(`FATAL: ${err.message}`);
  process.exit(1);
});
