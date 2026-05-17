import type Stripe from "stripe";

// ─── Configuration ───────────────────────────────────────────────

export interface StripeMCPConfig {
  /** Stripe secret key (prefixed sk_live_ or sk_test_) */
  secretKey: string;
  /** Stripe webhook signing secret (prefixed whsec_) — required for webhook tools */
  webhookSecret?: string;
  /** Transport mode: 'stdio' (default) or 'http' */
  transport?: "stdio" | "http";
  /** HTTP port (default: 3100) */
  port?: number;
}

// ─── Tool input types ────────────────────────────────────────────

export interface CreatePaymentIntentInput {
  amount: number; // in cents
  currency: string; // e.g. "usd"
  customer?: string; // Stripe customer ID
  description?: string;
  metadata?: Record<string, string>;
  payment_method_types?: string[];
  receipt_email?: string;
  setup_future_usage?: "on_session" | "off_session";
}

export interface RetrievePaymentIntentInput {
  payment_intent_id: string;
}

export interface ConfirmPaymentIntentInput {
  payment_intent_id: string;
  payment_method?: string;
  return_url?: string;
}

export interface CancelPaymentIntentInput {
  payment_intent_id: string;
}

export interface CreateRefundInput {
  payment_intent_id: string;
  amount?: number; // partial refund amount in cents
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
}

export interface ListPaymentIntentsInput {
  customer?: string;
  limit?: number;
  starting_after?: string;
  ending_before?: string;
}

// ─── Customer ────────────────────────────────────────────────────

export interface CreateCustomerInput {
  email?: string;
  name?: string;
  description?: string;
  metadata?: Record<string, string>;
  payment_method?: string;
  invoice_settings?: Stripe.CustomerCreateParams.InvoiceSettings;
  address?: Stripe.AddressParam;
  shipping?: Stripe.CustomerCreateParams.Shipping;
}

export interface RetrieveCustomerInput {
  customer_id: string;
}

export interface UpdateCustomerInput {
  customer_id: string;
  email?: string;
  name?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface DeleteCustomerInput {
  customer_id: string;
}

export interface ListCustomersInput {
  email?: string;
  limit?: number;
  starting_after?: string;
  ending_before?: string;
}

// ─── Subscription ────────────────────────────────────────────────

export interface CreateSubscriptionInput {
  customer: string;
  items: Array<{
    price: string; // Stripe price ID
    quantity?: number;
  }>;
  coupon?: string;
  trial_period_days?: number;
  metadata?: Record<string, string>;
  billing_cycle_anchor?: "now" | "unchanged";
  payment_behavior?: Stripe.SubscriptionCreateParams.PaymentBehavior;
  cancel_at_period_end?: boolean;
}

export interface RetrieveSubscriptionInput {
  subscription_id: string;
}

export interface UpdateSubscriptionInput {
  subscription_id: string;
  cancel_at_period_end?: boolean;
  coupon?: string;
  items?: Array<{
    id?: string;
    price?: string;
    quantity?: number;
    deleted?: boolean;
  }>;
  metadata?: Record<string, string>;
  proration_behavior?: Stripe.SubscriptionUpdateParams.ProrationBehavior;
}

export interface CancelSubscriptionInput {
  subscription_id: string;
  invoice_now?: boolean;
  prorate?: boolean;
}

export interface ListSubscriptionsInput {
  customer?: string;
  price?: string;
  status?: Stripe.Subscription.Status;
  limit?: number;
  starting_after?: string;
  ending_before?: string;
}

// ─── Balance ─────────────────────────────────────────────────────

export interface RetrieveBalanceInput {
  /** No parameters required — retrieves current balance */
}

export interface ListBalanceTransactionsInput {
  payout?: string;
  type?: Stripe.BalanceTransaction.Type;
  currency?: string;
  limit?: number;
  starting_after?: string;
  ending_before?: string;
}

// ─── Webhook ─────────────────────────────────────────────────────

export interface ConstructWebhookEventInput {
  payload: string; // raw request body
  signature: string; // Stripe-Signature header
}

export interface ListWebhookEndpointsInput {
  limit?: number;
  starting_after?: string;
  ending_before?: string;
}

export interface CreateWebhookEndpointInput {
  url: string;
  enabled_events: Stripe.WebhookEndpointCreateParams.EnabledEvent[];
  description?: string;
  connect?: boolean;
}

export interface DeleteWebhookEndpointInput {
  webhook_endpoint_id: string;
}

// ─── Tool response wrapper ───────────────────────────────────────

export interface ToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── Server info ─────────────────────────────────────────────────

export const SERVER_INFO = {
  name: "stripe-mcp-server",
  version: "1.0.0",
  description:
    "Premium MCP server for Stripe — payments, subscriptions, customers, webhooks, and balance management",
} as const;
