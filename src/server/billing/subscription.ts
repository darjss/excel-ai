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
  providerSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
}

export type SubscriptionEventOutcome =
  | { kind: "ignored" }
  | {
      kind: "applied";
      userId: string;
      previousTier: PlanSlug;
      nextTier: PlanSlug;
      supersededSubscriptionId: string | null;
    };

const STATUSES: ReadonlySet<string> = new Set(["active", "canceled", "past_due"]);

const isStatus = (value: string): value is SubscriptionStatus => STATUSES.has(value);

const effectiveTier = (planSlug: PlanSlug, status: SubscriptionStatus): PlanSlug =>
  status === "active" ? planSlug : "standard";

const devBypassSubscription = (userId: string): Subscription => ({
  userId,
  planSlug: env.BILLING_DEV_BYPASS_PLAN,
  status: "active",
  providerSubscriptionId: null,
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
    providerSubscriptionId: row.polarSubscriptionId,
    currentPeriodEnd: row.currentPeriodEnd,
  };
};

export const hasActiveSubscription = (
  subscription: Subscription | null,
): subscription is Subscription =>
  subscription !== null && subscription.status === "active";

export const upsertSubscription = async (
  snapshot: SubscriptionSnapshot,
): Promise<SubscriptionEventOutcome> => {
  const [existing] = await db
    .select()
    .from(supplierSubscription)
    .where(eq(supplierSubscription.userId, snapshot.userId));

  const previousTier =
    existing && isPlanSlug(existing.planSlug) && isStatus(existing.status)
      ? effectiveTier(existing.planSlug, existing.status)
      : "standard";

  let supersededSubscriptionId: string | null = null;
  const storedId = existing?.polarSubscriptionId ?? null;
  const isCurrentIdentity = storedId === null || storedId === snapshot.providerSubscriptionId;

  if (!isCurrentIdentity) {
    if (snapshot.status !== "active") {
      console.warn(
        `Ignoring ${snapshot.status} event for subscription ${snapshot.providerSubscriptionId}: ` +
          `it does not match the current subscription ${storedId} for user ${snapshot.userId}.`,
      );
      return { kind: "ignored" };
    }
    supersededSubscriptionId = storedId;
  }

  await db
    .insert(supplierSubscription)
    .values({
      userId: snapshot.userId,
      planSlug: snapshot.planSlug,
      status: snapshot.status,
      polarSubscriptionId: snapshot.providerSubscriptionId,
      currentPeriodEnd: snapshot.currentPeriodEnd,
    })
    .onConflictDoUpdate({
      target: supplierSubscription.userId,
      set: {
        planSlug: snapshot.planSlug,
        status: snapshot.status,
        polarSubscriptionId: snapshot.providerSubscriptionId,
        currentPeriodEnd: snapshot.currentPeriodEnd,
        updatedAt: new Date(),
      },
    });

  return {
    kind: "applied",
    userId: snapshot.userId,
    previousTier,
    nextTier: effectiveTier(snapshot.planSlug, snapshot.status),
    supersededSubscriptionId,
  };
};
