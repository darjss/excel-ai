import { and, eq, isNotNull } from "drizzle-orm";
import type { PlanSlug } from "@/lib/plans";
import { db } from "@/server/db";
import { portalDraft } from "@/server/db/schema";
import { purgePortalCache } from "@/server/portal/cache";
import { restampPublishedTier } from "@/server/portal/store";
import type { PaymentProvider, SubscriptionSnapshot } from "./provider";
import { upsertSubscription } from "./subscription";

const publishedSlugForUser = async (userId: string): Promise<string | null> => {
  const [row] = await db
    .select({ slug: portalDraft.slug })
    .from(portalDraft)
    .where(and(eq(portalDraft.userId, userId), isNotNull(portalDraft.slug)));
  return row?.slug ?? null;
};

const restampTier = async (userId: string, tier: PlanSlug): Promise<void> => {
  const slug = await publishedSlugForUser(userId);
  if (!slug) return;
  await restampPublishedTier(slug, tier);
  await purgePortalCache(slug);
};

export const handleSubscriptionEvent = async (
  snapshot: SubscriptionSnapshot,
  provider: Pick<PaymentProvider, "cancelSubscription">,
): Promise<void> => {
  const outcome = await upsertSubscription(snapshot);
  if (outcome.kind === "ignored") return;

  if (outcome.supersededSubscriptionId !== null) {
    const supersededId = outcome.supersededSubscriptionId;
    void provider.cancelSubscription(supersededId).catch((error: unknown) => {
      console.error(`Failed to cancel superseded subscription ${supersededId}:`, error);
    });
  }

  if (outcome.previousTier !== outcome.nextTier) {
    await restampTier(outcome.userId, outcome.nextTier);
  }
};
