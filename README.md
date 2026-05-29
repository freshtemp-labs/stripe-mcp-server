# 🔌 Stripe MCP Server

> Production-ready Stripe integration for AI agents — payments, subscriptions, customers, webhooks — part of the **Hermes Agent 生态**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **Payments** — Create, retrieve, update, and list payment intents
- **Subscriptions** — Manage subscription lifecycle (create, cancel, update)
- **Customers** — Customer CRUD with payment method management
- **Webhooks** — Webhook signature verification and event handling
- **Balance** — Account balance and transaction history

## Architecture

```
src/
  index.ts           — MCP server entry point (stdio + HTTP)
  tools/
    payments.ts      — Payment intent tools
    subscriptions.ts — Subscription management tools
    customers.ts     — Customer management tools
    webhooks.ts      — Webhook handling tools
    balance.ts       — Balance inquiry tools
  utils/
    stripe-client.ts — Stripe SDK client wrapper
    validation.ts    — Zod input validation schemas
```

## Quick Start

```bash
# Install
npm install

# Set up Stripe API key
export STRIPE_SECRET_KEY=sk_test_...

# Run
npm start
```

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: MCP SDK (Model Context Protocol)
- **Validation**: Zod
- **Transport**: stdio + HTTP

## License

MIT
