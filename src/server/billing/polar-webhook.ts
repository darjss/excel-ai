import { isPlanSlug, type PlanSlug } from "@/lib/plans";
import type { SubscriptionSnapshot, SubscriptionStatus } from "./provider";

export interface PolarSubscriptionPayload {
  id: string;
  status: string;
  productId: string;
  currentPeriodEnd?: Date | string | null;
  customer?: { externalId?: string | null } | null;
}

export type ProductPlanMap = Record<PlanSlug, string | undefined>;

export const mapStatus = (status: string): SubscriptionStatus => {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid" || status === "incomplete") return "past_due";
  return "canceled";
};

const planSlugForProduct = (products: ProductPlanMap, productId: string): PlanSlug | null => {
  const entry = Object.entries(products).find(([, id]) => id === productId);
  return entry && isPlanSlug(entry[0]) ? entry[0] : null;
};

export const subscriptionSnapshotFromPolar = (
  data: PolarSubscriptionPayload,
  products: ProductPlanMap,
  statusOverride?: SubscriptionStatus,
): SubscriptionSnapshot | null => {
  const userId = data.customer?.externalId;
  if (!userId) return null;
  const planSlug = planSlugForProduct(products, data.productId);
  if (!planSlug) return null;
  return {
    userId,
    planSlug,
    status: statusOverride ?? mapStatus(data.status),
    providerSubscriptionId: data.id,
    currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null,
  };
};
