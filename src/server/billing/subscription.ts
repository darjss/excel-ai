import { eq } from "drizzle-orm";
import { env } from "@/env";
import { isPlanSlug, type PlanSlug } from "@/lib/plans";
import { db } from "@/server/db";
import { supplierSubscription } from "@/server/db/schema";
import type { SubscriptionSnapshot, SubscriptionStatus } from "./provider";

export interface Subscription {
  userId: string;
  planSlug: PlanSlug;
  status: SubscriptionStatus;
  polarSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
}

const STATUSES: ReadonlySet<string> = new Set(["active", "canceled", "past_due"]);

const isStatus = (value: string): value is SubscriptionStatus => STATUSES.has(value);

const devBypassSubscription = (userId: string): Subscription => ({
  userId,
  planSlug: env.BILLING_DEV_BYPASS_PLAN,
  status: "active",
  polarSubscriptionId: null,
  currentPeriodEnd: null,
});

export const getSubscription = async (userId: string): Promise<Subscription | null> => {
  if (env.BILLING_DEV_BYPASS === "true") return devBypassSubscription(userId);

  const [row] = await db
    .select()
    .from(supplierSubscription)
    .where(eq(supplierSubscription.userId, userId));
  if (!row) return null;
  if (!isPlanSlug(row.planSlug) || !isStatus(row.status)) return null;

  return {
    userId: row.userId,
    planSlug: row.planSlug,
    status: row.status,
    polarSubscriptionId: row.polarSubscriptionId,
    currentPeriodEnd: row.currentPeriodEnd,
  };
};

export const hasActiveSubscription = (
  subscription: Subscription | null,
): subscription is Subscription =>
  subscription !== null && subscription.status === "active";

export const upsertSubscription = async (snapshot: SubscriptionSnapshot): Promise<void> => {
  await db
    .insert(supplierSubscription)
    .values({
      userId: snapshot.userId,
      planSlug: snapshot.planSlug,
      status: snapshot.status,
      polarSubscriptionId: snapshot.polarSubscriptionId,
      currentPeriodEnd: snapshot.currentPeriodEnd,
    })
    .onConflictDoUpdate({
      target: supplierSubscription.userId,
      set: {
        planSlug: snapshot.planSlug,
        status: snapshot.status,
        polarSubscriptionId: snapshot.polarSubscriptionId,
        currentPeriodEnd: snapshot.currentPeriodEnd,
        updatedAt: new Date(),
      },
    });
};
