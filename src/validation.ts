import { z } from "zod";

// ─── Payment Intents ─────────────────────────────────────────────

export const CreatePaymentIntentSchema = z.object({
  amount: z.number().int().positive("Amount must be positive (in cents)"),
  currency: z.string().length(3).toLowerCase().default("usd"),
  customer: z.string().optional(),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  payment_method_types: z.array(z.string()).optional(),
  receipt_email: z.string().email().optional(),
  setup_future_usage: z.enum(["on_session", "off_session"]).optional(),
});

export const RetrievePaymentIntentSchema = z.object({
  payment_intent_id: z
    .string()
    .startsWith("pi_", "Must be a valid payment intent ID (starts with pi_)"),
});

export const ConfirmPaymentIntentSchema = z.object({
  payment_intent_id: z.string().startsWith("pi_"),
  payment_method: z.string().startsWith("pm_").optional(),
  return_url: z.string().url().optional(),
});

export const CancelPaymentIntentSchema = z.object({
  payment_intent_id: z.string().startsWith("pi_"),
});

export const CreateRefundSchema = z.object({
  payment_intent_id: z.string().startsWith("pi_"),
  amount: z.number().int().positive().optional(),
  reason: z
    .enum(["duplicate", "fraudulent", "requested_by_customer"])
    .optional(),
});

export const ListPaymentIntentsSchema = z.object({
  customer: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(10),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
});

// ─── Customers ───────────────────────────────────────────────────

export const CreateCustomerSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  payment_method: z.string().startsWith("pm_").optional(),
  invoice_settings: z
    .object({
      default_payment_method: z.string().optional(),
      footer: z.string().optional(),
    })
    .optional(),
  address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().length(2).optional(),
    })
    .optional(),
  shipping: z
    .object({
      name: z.string(),
      address: z.object({
        line1: z.string(),
        line2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postal_code: z.string().optional(),
        country: z.string().length(2),
      }),
      phone: z.string().optional(),
    })
    .optional(),
});

export const RetrieveCustomerSchema = z.object({
  customer_id: z
    .string()
    .startsWith("cus_", "Must be a valid customer ID (starts with cus_)"),
});

export const UpdateCustomerSchema = z.object({
  customer_id: z.string().startsWith("cus_"),
  email: z.string().email().optional(),
  name: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export const DeleteCustomerSchema = z.object({
  customer_id: z.string().startsWith("cus_"),
});

export const ListCustomersSchema = z.object({
  email: z.string().email().optional(),
  limit: z.number().int().min(1).max(100).default(10),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
});

// ─── Subscriptions ───────────────────────────────────────────────

export const CreateSubscriptionSchema = z.object({
  customer: z.string().startsWith("cus_"),
  items: z
    .array(
      z.object({
        price: z.string().startsWith("price_"),
        quantity: z.number().int().min(1).default(1),
      })
    )
    .min(1),
  coupon: z.string().optional(),
  trial_period_days: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  billing_cycle_anchor: z.enum(["now", "unchanged"]).optional(),
  payment_behavior: z
    .enum([
      "allow_incomplete",
      "default_incomplete",
      "error_if_incomplete",
      "pending_if_incomplete",
    ])
    .optional(),
  cancel_at_period_end: z.boolean().optional(),
});

export const RetrieveSubscriptionSchema = z.object({
  subscription_id: z.string().startsWith("sub_"),
});

export const UpdateSubscriptionSchema = z.object({
  subscription_id: z.string().startsWith("sub_"),
  cancel_at_period_end: z.boolean().optional(),
  coupon: z.string().optional(),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        price: z.string().optional(),
        quantity: z.number().int().optional(),
        deleted: z.boolean().optional(),
      })
    )
    .optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  proration_behavior: z
    .enum(["always_invoice", "create_prorations", "none"])
    .optional(),
});

export const CancelSubscriptionSchema = z.object({
  subscription_id: z.string().startsWith("sub_"),
  invoice_now: z.boolean().optional(),
  prorate: z.boolean().optional(),
});

export const ListSubscriptionsSchema = z.object({
  customer: z.string().optional(),
  price: z.string().optional(),
  status: z
    .enum([
      "active",
      "past_due",
      "unpaid",
      "canceled",
      "incomplete",
      "incomplete_expired",
      "trialing",
      "paused",
    ] as const)
    .optional(),
  limit: z.number().int().min(1).max(100).default(10),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
});

// ─── Balance ─────────────────────────────────────────────────────

export const RetrieveBalanceSchema = z.object({});

export const ListBalanceTransactionsSchema = z.object({
  payout: z.string().optional(),
  type: z
    .enum([
      "adjustment",
      "advance",
      "advance_funding",
      "anticipation_repayment",
      "application_fee",
      "application_fee_refund",
      "charge",
      "connect_collection_transfer",
      "contribution",
      "issuing_authorization_hold",
      "issuing_authorization_release",
      "issuing_dispute",
      "issuing_transaction",
      "obligation_outbound",
      "obligation_reversal_inbound",
      "payment",
      "payment_failure_refund",
      "payment_refund",
      "payment_reversal",
      "payout",
      "payout_cancel",
      "payout_failure",
      "refund",
      "refund_failure",
      "reserve_transaction",
      "reserved_funds",
      "stripe_fee",
      "stripe_fx_fee",
      "tax_fee",
      "topup",
      "topup_reversal",
      "transfer",
      "transfer_cancel",
      "transfer_failure",
      "transfer_refund",
    ] as const)
    .optional(),
  currency: z.string().length(3).optional(),
  limit: z.number().int().min(1).max(100).default(10),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
});

// ─── Webhooks ────────────────────────────────────────────────────

export const ConstructWebhookEventSchema = z.object({
  payload: z.string().min(1, "Payload cannot be empty"),
  signature: z.string().min(1, "Signature cannot be empty"),
});

export const ListWebhookEndpointsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
});

export const CreateWebhookEndpointSchema = z.object({
  url: z
    .string()
    .url("Must be a valid URL")
    .startsWith("https://", "Webhook URL must use HTTPS"),
  enabled_events: z
    .array(z.string())
    .min(1, "At least one event type is required"),
  description: z.string().max(500).optional(),
  connect: z.boolean().optional(),
});

export const DeleteWebhookEndpointSchema = z.object({
  webhook_endpoint_id: z.string().startsWith("we_"),
});
