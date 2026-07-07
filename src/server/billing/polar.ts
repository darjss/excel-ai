import { polar, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { env } from "@/env";
import { isPlanSlug } from "@/lib/plans";
import { NotFoundError } from "@/server/api/errors";
import { handleSubscriptionEvent } from "./lifecycle";
import {
  type PolarSubscriptionPayload,
  type ProductPlanMap,
  subscriptionSnapshotFromPolar,
} from "./polar-webhook";
import type { PaymentProvider, SubscriptionStatus } from "./provider";

const client = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
});

const productIdBySlug: ProductPlanMap = {
  standard: env.POLAR_PRODUCT_ID_STANDARD,
  pro: env.POLAR_PRODUCT_ID_PRO,
};

const polarConfigured = !env.POLAR_ACCESS_TOKEN.includes("placeholder");

const productIdFor = (planSlug: string) => {
  if (!isPlanSlug(planSlug)) throw new NotFoundError(`Unknown plan "${planSlug}"`);
  const productId = productIdBySlug[planSlug];
  if (!productId) throw new NotFoundError(`No Polar product configured for plan "${planSlug}"`);
  return productId;
};

const applySubscriptionEvent = async (
  data: PolarSubscriptionPayload,
  statusOverride?: SubscriptionStatus,
): Promise<void> => {
  const snapshot = subscriptionSnapshotFromPolar(data, productIdBySlug, statusOverride);
  if (snapshot) await handleSubscriptionEvent(snapshot, polarProvider);
};

export const polarProvider: PaymentProvider = {
  name: "polar",

  createCheckout: async ({ userId, planSlug, successUrl }) => {
    const session = await client.checkouts.create({
      products: [productIdFor(planSlug)],
      externalCustomerId: userId,
      successUrl,
    });
    return { url: session.url };
  },

  cancelSubscription: async (subscriptionId) => {
    await client.subscriptions.revoke({ id: subscriptionId });
  },

  authPlugin: polar({
    client,
    createCustomerOnSignUp: polarConfigured,
    use: [
      portal(),
      webhooks({
        secret: env.POLAR_WEBHOOK_SECRET,
        onSubscriptionActive: (payload) => applySubscriptionEvent(payload.data),
        onSubscriptionUpdated: (payload) => applySubscriptionEvent(payload.data),
        onSubscriptionCanceled: (payload) => applySubscriptionEvent(payload.data),
        onSubscriptionRevoked: (payload) => applySubscriptionEvent(payload.data, "canceled"),
      }),
    ],
  }),
};
