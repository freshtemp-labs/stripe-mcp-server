import { describe, it, expect } from "vitest";
import {
  CreatePaymentIntentSchema,
  RetrievePaymentIntentSchema,
  ConfirmPaymentIntentSchema,
  CancelPaymentIntentSchema,
  CreateRefundSchema,
  ListPaymentIntentsSchema,
  CreateCustomerSchema,
  RetrieveCustomerSchema,
  UpdateCustomerSchema,
  DeleteCustomerSchema,
  CreateSubscriptionSchema,
  RetrieveSubscriptionSchema,
  CancelSubscriptionSchema,
  RetrieveBalanceSchema,
  CreateWebhookEndpointSchema,
  ConstructWebhookEventSchema,
} from "../src/validation.js";

describe("Zod Schemas — PaymentIntents", () => {
  it("CreatePaymentIntentSchema parses valid input", () => {
    const result = CreatePaymentIntentSchema.safeParse({
      amount: 2000,
      currency: "usd",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(2000);
      expect(result.data.currency).toBe("usd");
    }
  });

  it("CreatePaymentIntentSchema defaults currency to usd", () => {
    const result = CreatePaymentIntentSchema.safeParse({ amount: 5000 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("usd");
    }
  });

  it("CreatePaymentIntentSchema rejects negative amount", () => {
    const result = CreatePaymentIntentSchema.safeParse({ amount: -100 });
    expect(result.success).toBe(false);
  });

  it("CreatePaymentIntentSchema rejects zero amount", () => {
    const result = CreatePaymentIntentSchema.safeParse({ amount: 0 });
    expect(result.success).toBe(false);
  });

  it("CreatePaymentIntentSchema rejects missing amount", () => {
    const result = CreatePaymentIntentSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("RetrievePaymentIntentSchema validates pi_ prefix", () => {
    const valid = RetrievePaymentIntentSchema.safeParse({
      payment_intent_id: "pi_3abc123def456",
    });
    expect(valid.success).toBe(true);

    const invalid = RetrievePaymentIntentSchema.safeParse({
      payment_intent_id: "cus_ABC123",
    });
    expect(invalid.success).toBe(false);
  });

  it("ConfirmPaymentIntentSchema parses valid input", () => {
    const result = ConfirmPaymentIntentSchema.safeParse({
      payment_intent_id: "pi_123",
      payment_method: "pm_456",
    });
    expect(result.success).toBe(true);
  });

  it("CancelPaymentIntentSchema parses valid input", () => {
    const result = CancelPaymentIntentSchema.safeParse({
      payment_intent_id: "pi_123",
    });
    expect(result.success).toBe(true);
  });

  it("CreateRefundSchema accepts partial amount and reason", () => {
    const full = CreateRefundSchema.safeParse({ payment_intent_id: "pi_123" });
    expect(full.success).toBe(true);

    const partial = CreateRefundSchema.safeParse({
      payment_intent_id: "pi_123",
      amount: 500,
      reason: "requested_by_customer",
    });
    expect(partial.success).toBe(true);

    const bad = CreateRefundSchema.safeParse({
      payment_intent_id: "pi_123",
      reason: "not_a_valid_reason",
    });
    expect(bad.success).toBe(false);
  });
});

describe("Zod Schemas — Customers", () => {
  it("CreateCustomerSchema parses valid input", () => {
    const result = CreateCustomerSchema.safeParse({
      email: "jenny@example.com",
      name: "Jenny Rosen",
    });
    expect(result.success).toBe(true);
  });

  it("CreateCustomerSchema rejects invalid email", () => {
    const result = CreateCustomerSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("RetrieveCustomerSchema validates cus_ prefix", () => {
    const valid = RetrieveCustomerSchema.safeParse({ customer_id: "cus_ABC" });
    expect(valid.success).toBe(true);

    const invalid = RetrieveCustomerSchema.safeParse({ customer_id: "pi_123" });
    expect(invalid.success).toBe(false);
  });

  it("UpdateCustomerSchema allows partial updates", () => {
    const result = UpdateCustomerSchema.safeParse({
      customer_id: "cus_ABC",
      name: "New Name",
    });
    expect(result.success).toBe(true);
  });
});

describe("Zod Schemas — Subscriptions", () => {
  it("CreateSubscriptionSchema parses valid input", () => {
    const result = CreateSubscriptionSchema.safeParse({
      customer: "cus_ABC",
      items: [{ price: "price_pro" }, { price: "price_addon", quantity: 3 }],
      trial_period_days: 14,
    });
    expect(result.success).toBe(true);
  });

  it("CreateSubscriptionSchema rejects empty items", () => {
    const result = CreateSubscriptionSchema.safeParse({
      customer: "cus_ABC",
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("CreateSubscriptionSchema requires customer", () => {
    const result = CreateSubscriptionSchema.safeParse({
      items: [{ price: "price_pro" }],
    });
    expect(result.success).toBe(false);
  });

  it("CancelSubscriptionSchema parses valid input", () => {
    const result = CancelSubscriptionSchema.safeParse({
      subscription_id: "sub_123",
      invoice_now: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("Zod Schemas — Webhooks", () => {
  it("ConstructWebhookEventSchema requires payload and signature", () => {
    const result = ConstructWebhookEventSchema.safeParse({
      payload: JSON.stringify({ id: "evt_123", type: "charge.succeeded" }),
      signature: "t=123,v1=abc,v0=def",
    });
    expect(result.success).toBe(true);

    const missing = ConstructWebhookEventSchema.safeParse({
      payload: "{}",
    });
    expect(missing.success).toBe(false);
  });

  it("CreateWebhookEndpointSchema rejects non-https URL", () => {
    const result = CreateWebhookEndpointSchema.safeParse({
      url: "http://example.com/webhook",
      enabled_events: ["payment_intent.succeeded"],
    });
    expect(result.success).toBe(false);
  });
});
