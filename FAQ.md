# FAQ

## General

### What is an MCP server?

A Model Context Protocol (MCP) server gives AI agents (like Claude Desktop, Hermes, or Cursor) access to external services — in this case, Stripe. The agent can call Stripe tools directly instead of you having to copy-paste IDs or run curl commands.

### Is this official Stripe product?

No. This is a community-built server that wraps the official [Stripe Node.js SDK](https://github.com/stripe/stripe-node). Stripe's SDK does the heavy lifting; this server wires it into the MCP protocol.

### Do I need a Stripe account?

Yes. You need a [Stripe account](https://dashboard.stripe.com/register) and an API key from the [Dashboard](https://dashboard.stripe.com/apikeys).

---

## Security

### Where is my API key stored?

Nowhere in the code. The server reads `STRIPE_SECRET_KEY` from the environment variable at startup and holds it in memory. It's never written to disk, logged, or persisted.

### Can I use this in production?

Yes — but test thoroughly in Stripe test mode first. The server uses the official Stripe SDK, which is production-hardened. The MCP layer adds no caching, persistence, or storage of its own.

### Is webhook signature verification secure?

Yes. The `construct_webhook_event` tool uses `stripe.webhooks.constructEvent()` — the same method Stripe's official examples use. It verifies the signature against your `STRIPE_WEBHOOK_SECRET` before returning event data.

### Can I restrict which tools my agent can use?

MCP servers today expose all tools. If you want to restrict access (e.g., read-only), configure a Stripe [restricted API key](https://dashboard.stripe.com/apikeys) with only the permissions you want.

---

## Transport

### Stdio vs HTTP — which should I use?

| Transport | Use when |
|-----------|----------|
| **stdio** (default) | Local use with Claude Desktop, Hermes, Cursor, or any MCP client that spawns processes |
| **HTTP** (`--http`) | Remote use, browser-based MCP clients, or when you need the built-in `/webhook` receiver |

Both modes expose the same 22 tools.

### How do I switch to HTTP mode?

Add `--http` to the startup command:

```bash
STRIPE_SECRET_KEY=sk_test_key npx stripe-mcp-server --http
```

Or set the `PORT` env var to change the port:

```bash
STRIPE_SECRET_KEY=sk_test_key PORT=8080 npx stripe-mcp-server --http
```

### Can I run the HTTP server behind nginx/Caddy?

Yes. The HTTP server is a standard Express app. Proxy it like any other Node.js service. Example (nginx):

```nginx
location /mcp {
    proxy_pass http://localhost:3100/mcp;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

## Tools

### Why does `construct_webhook_event` require webhook secret?

Webhook signature verification is a premium feature that requires you to set up a webhook endpoint in Stripe Dashboard, get the signing secret (`whsec_...`), and provide it to the server. This prevents attackers from sending fake webhook events.

### How do I get my webhook signing secret?

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click your endpoint (or create one)
3. Click "Reveal" next to "Signing secret"
4. Copy the `whsec_...` value
5. Set it as `STRIPE_WEBHOOK_SECRET`

### Can I use publishable keys (pk_)?

No. The server requires a **secret key** (`sk_`). Publishable keys are for client-side use only (Stripe.js, Stripe Elements) and cannot perform server-side operations like creating customers or subscriptions.

### Does the server support Stripe Connect?

Not yet. The current version uses a single secret key. Connect platform accounts would need to manage multiple keys. This is on the roadmap.

### What Stripe API version does the server use?

`2024-11-20.acacia` — pinned in the Stripe client initialization. This ensures consistent behavior regardless of Stripe SDK or dashboard API version upgrades.

---

## Troubleshooting

### "Stripe API key not provided"

The `STRIPE_SECRET_KEY` environment variable is not set. Either:
- Set it in your shell before running: `export STRIPE_SECRET_KEY=sk_test_...`
- Add it to your MCP client config (e.g., Claude Desktop `env` field)

### "Must be a valid PaymentIntent ID (starts with pi_)"

Zod validation caught an invalid ID before it reached Stripe. IDs must match their expected prefixes:

| Type | Prefix |
|------|--------|
| PaymentIntent | `pi_` |
| Customer | `cus_` |
| Subscription | `sub_` |
| PaymentMethod | `pm_` |
| Price | `price_` |
| Webhook Endpoint | `we_` |

### "No such payment_intent: pi_bad"

The ID is valid format but doesn't exist on your Stripe account. Check:
- Are you using the right API key (test vs live)?
- Was the PaymentIntent created on this account?

### Server starts but agent can't connect

For stdio mode: make sure the MCP client config has the correct `command` and `args`. For Claude Desktop:

```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "stripe-mcp-server"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_..."
      }
    }
  }
}
```

### Webhook events aren't received

In HTTP mode, ensure:
1. Stripe is configured to send events to your server's `/webhook` URL (must be HTTPS in production)
2. `STRIPE_WEBHOOK_SECRET` is set to the correct `whsec_...` value
3. Your server is reachable from the internet (use [Stripe CLI](https://stripe.com/docs/stripe-cli) for local testing)

---

## Development

### How do I add a new tool?

1. Create the tool function in `src/tools/` (follow existing patterns)
2. Add Zod schemas for input validation
3. Register the tool in `src/server.ts` (`TOOLS` array + `handleToolCall` switch)
4. Add documentation

### How do I run tests?

```bash
npm test          # Run once
npm run test:watch # Watch mode
```

### What Node.js version is required?

Node.js ≥ 18 (uses ESM, global fetch).

### Can I contribute?

Absolutely! Open an issue or PR on [GitHub](https://github.com/billbtbillb-ui/stripe-mcp-server).
