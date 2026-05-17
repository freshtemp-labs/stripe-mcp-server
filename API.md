# API Reference

Full reference for all 22 tools exposed by the Stripe MCP Server.

All tools return:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message"
}
```

On error:
```json
{
  "success": false,
  "error": "Human-readable error description"
}
```

---

## PaymentIntents

### `create_payment_intent`

Create a PaymentIntent to accept a payment.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | number | ✓ | Amount in **cents** (e.g., 2000 = $20.00) |
| `currency` | string | | Three-letter ISO code (default: `usd`) |
| `customer` | string | | Stripe customer ID (starts with `cus_`) |
| `description` | string | | Description for the payment |
| `metadata` | object | | Key-value pairs (e.g., `{"order_id": "123"}`) |
| `receipt_email` | string | | Email to send receipt to |

**Returns:** PaymentIntent object with `client_secret` for client-side confirmation.

**Example:**
```json
{
  "amount": 2000,
  "currency": "usd",
  "customer": "cus_ABC123",
  "description": "Monthly subscription - Acme Pro"
}
```

---

### `retrieve_payment_intent`

Get PaymentIntent details by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payment_intent_id` | string | ✓ | PaymentIntent ID (starts with `pi_`) |

**Example:** `{ "payment_intent_id": "pi_3abc123def456" }`

---

### `confirm_payment_intent`

Confirm a PaymentIntent (for `manual` confirmation_method flows).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payment_intent_id` | string | ✓ | PaymentIntent ID |
| `payment_method` | string | | PaymentMethod ID (starts with `pm_`) |
| `return_url` | string | | URL to return to after confirmation |

---

### `cancel_payment_intent`

Cancel a PaymentIntent that hasn't been completed yet.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payment_intent_id` | string | ✓ | PaymentIntent ID |

---

### `create_refund`

Issue a refund for a completed payment.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payment_intent_id` | string | ✓ | PaymentIntent ID to refund |
| `amount` | number | | Amount in cents (omit for full refund) |
| `reason` | string | | One of: `duplicate`, `fraudulent`, `requested_by_customer` |

**Example (full refund):**
```json
{ "payment_intent_id": "pi_3abc123def456" }
```

**Example (partial refund):**
```json
{ "payment_intent_id": "pi_3abc123def456", "amount": 500, "reason": "requested_by_customer" }
```

---

### `list_payment_intents`

List PaymentIntents, optionally filtered by customer.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer` | string | | Filter by customer ID |
| `limit` | number | | Number to return (1-100, default: 10) |

---

## Customers

### `create_customer`

Create a new Stripe customer.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | | Customer email |
| `name` | string | | Customer name |
| `description` | string | | Free-text description |
| `metadata` | object | | Key-value metadata |

**Example:**
```json
{ "email": "jenny@example.com", "name": "Jenny Rosen", "description": "Premium tier customer" }
```

---

### `retrieve_customer`

Get customer by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_id` | string | ✓ | Customer ID (starts with `cus_`) |

---

### `update_customer`

Update customer info.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_id` | string | ✓ | Customer ID |
| `email` | string | | New email |
| `name` | string | | New name |
| `description` | string | | New description |
| `metadata` | object | | Key-value metadata |

---

### `delete_customer`

Delete a customer.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_id` | string | ✓ | Customer ID |

---

### `list_customers`

List customers, optionally filtered by email.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | | Filter by email address |
| `limit` | number | | Number to return (1-100, default: 10) |

---

## Subscriptions

### `create_subscription`

Create a subscription with one or more price items.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer` | string | ✓ | Customer ID (starts with `cus_`) |
| `items` | array | ✓ | Array of `{price, quantity?}` objects |
| `items[].price` | string | ✓ | Price ID (starts with `price_`) |
| `items[].quantity` | number | | Quantity (default: 1) |
| `coupon` | string | | Coupon ID to apply |
| `trial_period_days` | number | | Number of trial days |
| `metadata` | object | | Key-value metadata |
| `cancel_at_period_end` | boolean | | Cancel at end of billing period |

**Example:**
```json
{
  "customer": "cus_ABC123",
  "items": [
    { "price": "price_pro_monthly", "quantity": 1 },
    { "price": "price_premium_addon", "quantity": 2 }
  ],
  "trial_period_days": 14
}
```

---

### `retrieve_subscription`

Get subscription by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subscription_id` | string | ✓ | Subscription ID (starts with `sub_`) |

---

### `update_subscription`

Update a subscription (change items, coupon, cancel behavior).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subscription_id` | string | ✓ | Subscription ID |
| `cancel_at_period_end` | boolean | | Cancel at end of billing period |
| `coupon` | string | | New coupon |
| `items` | array | | Array of `{id?, price?, quantity?, deleted?}` |
| `metadata` | object | | Key-value metadata |

---

### `cancel_subscription`

Cancel a subscription.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subscription_id` | string | ✓ | Subscription ID |
| `invoice_now` | boolean | | Generate final invoice immediately |
| `prorate` | boolean | | Prorate the cancellation |

---

### `list_subscriptions`

List subscriptions, optionally filtered by customer or status.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer` | string | | Filter by customer |
| `status` | string | | One of: `active`, `past_due`, `unpaid`, `canceled`, `incomplete`, `trialing` |
| `limit` | number | | Number to return (1-100, default: 10) |

---

## Balance

### `retrieve_balance`

Get your Stripe account balance.

No parameters required.

**Returns:** Object with `available`, `pending`, and `instant_available` — each an array of `{amount, currency, source_types?}`.

---

### `list_balance_transactions`

List balance transactions (charges, fees, refunds, payouts, etc.).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | | Filter by type (e.g., `charge`, `refund`, `payout`) |
| `limit` | number | | Number to return (1-100, default: 10) |

---

## Webhooks (Premium)

> Requires `STRIPE_WEBHOOK_SECRET` to be set in environment variables.

### `construct_webhook_event`

Verify and construct a Stripe webhook event from raw payload and signature header.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payload` | string | ✓ | Raw request body as a string |
| `signature` | string | ✓ | Value of the `Stripe-Signature` header |

**Returns:** Verified Stripe Event object.

**Example:**
```json
{
  "payload": "{\"id\":\"evt_123\",\"type\":\"payment_intent.succeeded\",...}",
  "signature": "t=1234567890,v1=abcdef...,v0=..."
}
```

---

### `list_webhook_endpoints`

List configured webhook endpoints.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | | Number to return (1-100, default: 10) |

---

### `create_webhook_endpoint`

Create a new webhook endpoint. **Save the `secret` field from the response — it won't be shown again.**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | ✓ | HTTPS URL to receive events |
| `enabled_events` | array | ✓ | Event types (e.g., `["payment_intent.succeeded"]`) |
| `description` | string | | Description of this endpoint |

**Example:**
```json
{
  "url": "https://example.com/webhook",
  "enabled_events": ["payment_intent.succeeded", "customer.subscription.created"],
  "description": "Production webhook"
}
```

---

### `delete_webhook_endpoint`

Delete a webhook endpoint.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `webhook_endpoint_id` | string | ✓ | Webhook endpoint ID (starts with `we_`) |

---

## HTTP Endpoints

When running in HTTP mode (via `--http` flag):

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/mcp` | MCP Streamable HTTP endpoint (full protocol) |
| `POST` | `/webhook` | Stripe webhook receiver (direct) |
| `GET` | `/health` | Health check |
| `GET` | `/tools` | List available tools |

---

## Error Codes

All errors follow this structure:
```json
{
  "success": false,
  "error": "Human-readable error description"
}
```

Common errors:

| Error | Cause |
|-------|-------|
| `Stripe API key not provided` | `STRIPE_SECRET_KEY` is empty or missing |
| `Must be a valid PaymentIntent ID (starts with pi_)` | Zod validation failed |
| `No such payment_intent: pi_bad` | Stripe API returned 404 |
| `Webhook secret not configured` | `STRIPE_WEBHOOK_SECRET` not set (premium feature) |
| `Webhook signature verification failed` | Invalid signature or wrong secret |
