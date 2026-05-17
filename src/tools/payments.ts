import { getStripeClient } from "../stripe-client.js";
import {
  CreatePaymentIntentSchema,
  RetrievePaymentIntentSchema,
  ConfirmPaymentIntentSchema,
  CancelPaymentIntentSchema,
  CreateRefundSchema,
  ListPaymentIntentsSchema,
} from "../validation.js";
import type {
  CreatePaymentIntentInput,
  RetrievePaymentIntentInput,
  ConfirmPaymentIntentInput,
  CancelPaymentIntentInput,
  CreateRefundInput,
  ListPaymentIntentsInput,
  ToolResponse,
} from "../types.js";

export async function createPaymentIntent(
  input: CreatePaymentIntentInput
): Promise<ToolResponse> {
  const parsed = CreatePaymentIntentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const intent = await stripe.paymentIntents.create(parsed.data as any);
    return {
      success: true,
      data: {
        id: intent.id,
        amount: intent.amount,
        currency: intent.currency,
        status: intent.status,
        client_secret: intent.client_secret,
        created: intent.created,
      },
      message: `PaymentIntent ${intent.id} created (${intent.status})`,
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

export async function retrievePaymentIntent(
  input: RetrievePaymentIntentInput
): Promise<ToolResponse> {
  const parsed = RetrievePaymentIntentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors[0].message}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const intent = await stripe.paymentIntents.retrieve(
      parsed.data.payment_intent_id
    );
    return {
      success: true,
      data: stripPaymentIntent(intent),
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

export async function confirmPaymentIntent(
  input: ConfirmPaymentIntentInput
): Promise<ToolResponse> {
  const parsed = ConfirmPaymentIntentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors[0].message}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const intent = await stripe.paymentIntents.confirm(
      parsed.data.payment_intent_id,
      {
        payment_method: parsed.data.payment_method,
        return_url: parsed.data.return_url,
      }
    );
    return {
      success: true,
      data: {
        id: intent.id,
        status: intent.status,
        next_action: intent.next_action,
      },
      message: `PaymentIntent ${intent.id} confirmed (${intent.status})`,
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

export async function cancelPaymentIntent(
  input: CancelPaymentIntentInput
): Promise<ToolResponse> {
  const parsed = CancelPaymentIntentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors[0].message}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const intent = await stripe.paymentIntents.cancel(
      parsed.data.payment_intent_id
    );
    return {
      success: true,
      data: { id: intent.id, status: intent.status },
      message: `PaymentIntent ${intent.id} canceled`,
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

export async function createRefund(
  input: CreateRefundInput
): Promise<ToolResponse> {
  const parsed = CreateRefundSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors[0].message}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const refund = await stripe.refunds.create({
      payment_intent: parsed.data.payment_intent_id,
      amount: parsed.data.amount,
      reason: parsed.data.reason as any,
    });
    return {
      success: true,
      data: {
        id: refund.id,
        amount: refund.amount,
        status: refund.status,
        currency: refund.currency,
      },
      message: `Refund ${refund.id} created for ${(refund.amount / 100).toFixed(2)} ${refund.currency.toUpperCase()}`,
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

export async function listPaymentIntents(
  input: ListPaymentIntentsInput
): Promise<ToolResponse> {
  const parsed = ListPaymentIntentsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors[0].message}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const intents = await stripe.paymentIntents.list({
      customer: parsed.data.customer,
      limit: parsed.data.limit,
      starting_after: parsed.data.starting_after,
      ending_before: parsed.data.ending_before,
    });
    return {
      success: true,
      data: {
        items: intents.data.map(stripPaymentIntent),
        has_more: intents.has_more,
        total_count: intents.data.length,
      },
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

function stripPaymentIntent(intent: any) {
  return {
    id: intent.id,
    amount: intent.amount,
    currency: intent.currency,
    status: intent.status,
    customer: intent.customer,
    description: intent.description,
    created: intent.created,
    metadata: intent.metadata,
    payment_method_types: intent.payment_method_types,
  };
}
