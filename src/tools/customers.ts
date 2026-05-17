import { getStripeClient } from "../stripe-client.js";
import {
  CreateCustomerSchema,
  RetrieveCustomerSchema,
  UpdateCustomerSchema,
  DeleteCustomerSchema,
  ListCustomersSchema,
} from "../validation.js";
import type {
  CreateCustomerInput,
  RetrieveCustomerInput,
  UpdateCustomerInput,
  DeleteCustomerInput,
  ListCustomersInput,
  ToolResponse,
} from "../types.js";

export async function createCustomer(
  input: CreateCustomerInput
): Promise<ToolResponse> {
  const parsed = CreateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const customer = await stripe.customers.create(parsed.data as any);
    return {
      success: true,
      data: stripCustomer(customer),
      message: `Customer ${customer.id} created`,
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

export async function retrieveCustomer(
  input: RetrieveCustomerInput
): Promise<ToolResponse> {
  const parsed = RetrieveCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors[0].message}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const customer = await stripe.customers.retrieve(parsed.data.customer_id);
    if ((customer as any).deleted) {
      return { success: false, error: "Customer has been deleted" };
    }
    return {
      success: true,
      data: stripCustomer(customer as any),
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

export async function updateCustomer(
  input: UpdateCustomerInput
): Promise<ToolResponse> {
  const parsed = UpdateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors[0].message}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const { customer_id, ...updates } = parsed.data;
    const customer = await stripe.customers.update(customer_id, updates);
    return {
      success: true,
      data: stripCustomer(customer),
      message: `Customer ${customer.id} updated`,
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

export async function deleteCustomer(
  input: DeleteCustomerInput
): Promise<ToolResponse> {
  const parsed = DeleteCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors[0].message}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const customer = await stripe.customers.del(parsed.data.customer_id);
    return {
      success: true,
      data: { id: customer.id, deleted: customer.deleted },
      message: `Customer ${customer.id} deleted`,
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

export async function listCustomers(
  input: ListCustomersInput
): Promise<ToolResponse> {
  const parsed = ListCustomersSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors[0].message}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const customers = await stripe.customers.list({
      email: parsed.data.email,
      limit: parsed.data.limit,
      starting_after: parsed.data.starting_after,
      ending_before: parsed.data.ending_before,
    });
    return {
      success: true,
      data: {
        items: customers.data.map(stripCustomer),
        has_more: customers.has_more,
        total_count: customers.data.length,
      },
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

function stripCustomer(customer: any) {
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    description: customer.description,
    created: customer.created,
    metadata: customer.metadata,
    invoice_prefix: customer.invoice_prefix,
    balance: customer.balance,
  };
}
