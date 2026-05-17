import { getStripeClient, getConfig } from "../stripe-client.js";
import {
  ConstructWebhookEventSchema,
  ListWebhookEndpointsSchema,
  CreateWebhookEndpointSchema,
  DeleteWebhookEndpointSchema,
} from "../validation.js";
import type {
  ConstructWebhookEventInput,
  ListWebhookEndpointsInput,
  CreateWebhookEndpointInput,
  DeleteWebhookEndpointInput,
  ToolResponse,
} from "../types.js";

/**
 * Construct and verify a Stripe webhook event from raw payload and signature.
 * This is a premium feature — requires a webhook signing secret.
 */
export async function constructWebhookEvent(
  input: ConstructWebhookEventInput
): Promise<ToolResponse> {
  const config = getConfig();
  if (!config.webhookSecret) {
    return {
      success: false,
      error:
        "Webhook secret not configured. Set STRIPE_WEBHOOK_SECRET or pass webhookSecret in config. This is a premium feature.",
    };
  }

  const parsed = ConstructWebhookEventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors[0].message}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(
      parsed.data.payload,
      parsed.data.signature,
      config.webhookSecret
    );

    return {
      success: true,
      data: {
        id: event.id,
        type: event.type,
        created: event.created,
        data: stripEventData(event),
        livemode: event.livemode,
      },
      message: `Webhook event ${event.type} verified successfully`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Webhook verification failed: ${err.message}`,
    };
  }
}

export async function listWebhookEndpoints(
  input: ListWebhookEndpointsInput
): Promise<ToolResponse> {
  const parsed = ListWebhookEndpointsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors[0].message}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const endpoints = await stripe.webhookEndpoints.list(parsed.data);
    return {
      success: true,
      data: {
        items: endpoints.data.map((ep) => ({
          id: ep.id,
          url: ep.url,
          enabled_events: ep.enabled_events,
          status: ep.status,
          created: ep.created,
          description: ep.description,
        })),
        has_more: endpoints.has_more,
        total_count: endpoints.data.length,
      },
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

export async function createWebhookEndpoint(
  input: CreateWebhookEndpointInput
): Promise<ToolResponse> {
  const parsed = CreateWebhookEndpointSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors[0].message}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const endpoint = await stripe.webhookEndpoints.create(
      parsed.data as any
    );
    return {
      success: true,
      data: {
        id: endpoint.id,
        url: endpoint.url,
        enabled_events: endpoint.enabled_events,
        secret: endpoint.secret, // IMPORTANT: user must save this
        status: endpoint.status,
      },
      message: `Webhook endpoint ${endpoint.id} created. Save the secret: ${endpoint.secret}`,
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

export async function deleteWebhookEndpoint(
  input: DeleteWebhookEndpointInput
): Promise<ToolResponse> {
  const parsed = DeleteWebhookEndpointSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors[0].message}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const endpoint = await stripe.webhookEndpoints.del(
      parsed.data.webhook_endpoint_id
    );
    return {
      success: true,
      data: { id: endpoint.id, deleted: endpoint.deleted },
      message: `Webhook endpoint ${endpoint.id} deleted`,
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

function stripEventData(event: any): Record<string, unknown> {
  const obj = event.data?.object;
  if (!obj) return {};

  // Return a sanitized version of the event object based on type
  switch (event.type) {
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed":
    case "payment_intent.created":
      return {
        id: obj.id,
        amount: obj.amount,
        currency: obj.currency,
        status: obj.status,
        customer: obj.customer,
      };
    case "invoice.paid":
    case "invoice.payment_failed":
      return {
        id: obj.id,
        amount_due: obj.amount_due,
        status: obj.status,
        customer: obj.customer,
        subscription: obj.subscription,
      };
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return {
        id: obj.id,
        status: obj.status,
        customer: obj.customer,
        current_period_end: obj.current_period_end,
      };
    default:
      return { object_type: obj.object, id: obj.id };
  }
}
