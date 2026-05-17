import Stripe from "stripe";
import type { StripeMCPConfig } from "./types.js";

let stripeInstance: Stripe | null = null;
let configInstance: StripeMCPConfig | null = null;

/**
 * Initialize the Stripe client with configuration.
 * Must be called before any tool can be used.
 */
export function initStripeClient(config: StripeMCPConfig): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(config.secretKey, {
      apiVersion: "2024-11-20.acacia" as any,
      typescript: true,
    });
    configInstance = config;
  }
  return stripeInstance;
}

/**
 * Get the Stripe client instance.
 * Throws if not initialized.
 */
export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    throw new Error(
      "Stripe client not initialized. Set STRIPE_SECRET_KEY environment variable or pass secretKey to initStripeClient()."
    );
  }
  return stripeInstance;
}

/**
 * Get the current configuration.
 */
export function getConfig(): StripeMCPConfig {
  if (!configInstance) {
    throw new Error(
      "Configuration not initialized. Call initStripeClient() first."
    );
  }
  return configInstance;
}

/**
 * Reset the client (useful for testing).
 */
export function resetStripeClient(): void {
  stripeInstance = null;
  configInstance = null;
}
