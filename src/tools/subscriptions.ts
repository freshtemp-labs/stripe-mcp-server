import { getStripeClient } from "../stripe-client.js";
import {
  CreateSubscriptionSchema,
  RetrieveSubscriptionSchema,
  UpdateSubscriptionSchema,
  CancelSubscriptionSchema,
  ListSubscriptionsSchema,
} from "../validation.js";
import type {
  CreateSubscriptionInput,
  RetrieveSubscriptionInput,
  UpdateSubscriptionInput,
  CancelSubscriptionInput,
  ListSubscriptionsInput,
  ToolResponse,
} from "../types.js";

export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<ToolResponse> {
  const parsed = CreateSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.create(
      parsed.data as any
    );
    return {
      success: true,
      data: stripSubscription(subscription),
      message: `Subscription ${subscription.id} created (${subscription.status})`,
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

export async function retrieveSubscription(
  input: RetrieveSubscriptionInput
): Promise<ToolResponse> {
  const parsed = RetrieveSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors[0].message}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const sub = await stripe.subscriptions.retrieve(parsed.data.subscription_id);
    return {
      success: true,
      data: stripSubscription(sub),
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

export async function updateSubscription(
  input: UpdateSubscriptionInput
): Promise<ToolResponse> {
  const parsed = UpdateSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors[0].message}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const { subscription_id, ...updates } = parsed.data;
    const sub = await stripe.subscriptions.update(subscription_id, updates as any);
    return {
      success: true,
      data: stripSubscription(sub),
      message: `Subscription ${sub.id} updated`,
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

export async function cancelSubscription(
  input: CancelSubscriptionInput
): Promise<ToolResponse> {
  const parsed = CancelSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors[0].message}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const sub = await stripe.subscriptions.cancel(
      parsed.data.subscription_id,
      {
        invoice_now: parsed.data.invoice_now,
        prorate: parsed.data.prorate,
      }
    );
    return {
      success: true,
      data: { id: sub.id, status: sub.status, canceled_at: sub.canceled_at },
      message: `Subscription ${sub.id} canceled`,
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

export async function listSubscriptions(
  input: ListSubscriptionsInput
): Promise<ToolResponse> {
  const parsed = ListSubscriptionsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors[0].message}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const subs = await stripe.subscriptions.list({
      customer: parsed.data.customer,
      price: parsed.data.price,
      status: parsed.data.status,
      limit: parsed.data.limit,
      starting_after: parsed.data.starting_after,
      ending_before: parsed.data.ending_before,
    });
    return {
      success: true,
      data: {
        items: subs.data.map(stripSubscription),
        has_more: subs.has_more,
        total_count: subs.data.length,
      },
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

function stripSubscription(sub: any) {
  return {
    id: sub.id,
    status: sub.status,
    customer: sub.customer,
    current_period_start: sub.current_period_start,
    current_period_end: sub.current_period_end,
    cancel_at_period_end: sub.cancel_at_period_end,
    canceled_at: sub.canceled_at,
    items: sub.items?.data?.map((item: any) => ({
      id: item.id,
      price: item.price?.id,
      quantity: item.quantity,
    })),
    metadata: sub.metadata,
  };
}
