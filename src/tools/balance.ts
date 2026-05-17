import { getStripeClient } from "../stripe-client.js";
import {
  RetrieveBalanceSchema,
  ListBalanceTransactionsSchema,
} from "../validation.js";
import type {
  RetrieveBalanceInput,
  ListBalanceTransactionsInput,
  ToolResponse,
} from "../types.js";

export async function retrieveBalance(
  _input: RetrieveBalanceInput = {}
): Promise<ToolResponse> {
  RetrieveBalanceSchema.safeParse(_input);

  try {
    const stripe = getStripeClient();
    const balance = await stripe.balance.retrieve();
    return {
      success: true,
      data: {
        available: balance.available.map((amt) => ({
          amount: amt.amount,
          currency: amt.currency,
        })),
        pending: balance.pending.map((amt) => ({
          amount: amt.amount,
          currency: amt.currency,
        })),
        instant_available: balance.instant_available?.map((amt) => ({
          amount: amt.amount,
          currency: amt.currency,
        })),
        livemode: balance.livemode,
      },
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}

export async function listBalanceTransactions(
  input: ListBalanceTransactionsInput
): Promise<ToolResponse> {
  const parsed = ListBalanceTransactionsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation error: ${parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")}`,
    };
  }

  try {
    const stripe = getStripeClient();
    const transactions = await stripe.balanceTransactions.list(
      parsed.data as any
    );
    return {
      success: true,
      data: {
        items: transactions.data.map((tx) => ({
          id: tx.id,
          amount: tx.amount,
          currency: tx.currency,
          type: tx.type,
          description: tx.description,
          status: tx.status,
          created: tx.created,
          fee: tx.fee,
          net: tx.net,
        })),
        has_more: transactions.has_more,
        total_count: transactions.data.length,
      },
    };
  } catch (err: any) {
    return { success: false, error: `Stripe error: ${err.message}` };
  }
}
