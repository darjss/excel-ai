import type { BetterAuthPlugin } from "better-auth";
import type { PlanSlug } from "@/lib/plans";

export interface CheckoutInput {
  userId: string;
  planSlug: string;
  successUrl: string;
}

export type SubscriptionStatus = "active" | "canceled" | "past_due";

export interface SubscriptionSnapshot {
  userId: string;
  planSlug: PlanSlug;
  status: SubscriptionStatus;
  providerSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
}

export interface PaymentProvider {
  name: string;
  createCheckout: (input: CheckoutInput) => Promise<{ url: string }>;
  cancelSubscription: (subscriptionId: string) => Promise<void>;
  authPlugin: BetterAuthPlugin;
}
