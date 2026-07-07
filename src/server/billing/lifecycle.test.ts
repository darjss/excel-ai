import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SubscriptionSnapshot } from "./provider";
import type { SubscriptionEventOutcome } from "./subscription";

const state = vi.hoisted(() => ({
  outcome: { kind: "ignored" } as SubscriptionEventOutcome,
  draftRows: [] as { slug: string | null }[],
  restamped: [] as { slug: string; tier: string }[],
  purged: [] as string[],
}));

vi.mock("./subscription", () => ({
  upsertSubscription: () => Promise.resolve(state.outcome),
}));

vi.mock("@/server/db", () => {
  const chain = { from: () => chain, where: () => Promise.resolve(state.draftRows) };
  return { db: { select: () => chain } };
});

vi.mock("@/server/db/schema", () => ({
  portalDraft: { userId: "userId", slug: "slug" },
}));

vi.mock("@/server/portal/store", () => ({
  restampPublishedTier: (slug: string, tier: string) => {
    state.restamped.push({ slug, tier });
    return Promise.resolve();
  },
}));

vi.mock("@/server/portal/cache", () => ({
  purgePortalCache: (slug: string) => {
    state.purged.push(slug);
    return Promise.resolve([]);
  },
}));

import { handleSubscriptionEvent } from "./lifecycle";

const snapshot: SubscriptionSnapshot = {
  userId: "user-1",
  planSlug: "pro",
  status: "active",
  providerSubscriptionId: "sub_new",
  currentPeriodEnd: null,
};

const applied = (over: Partial<Extract<SubscriptionEventOutcome, { kind: "applied" }>>) =>
  ({
    kind: "applied",
    userId: "user-1",
    previousTier: "standard",
    nextTier: "pro",
    supersededSubscriptionId: null,
    ...over,
  }) satisfies SubscriptionEventOutcome;

const cancel = vi.fn(() => Promise.resolve());
const provider = { cancelSubscription: cancel };

beforeEach(() => {
  state.outcome = { kind: "ignored" };
  state.draftRows = [{ slug: "acme" }];
  state.restamped = [];
  state.purged = [];
  cancel.mockClear();
});

describe("handleSubscriptionEvent", () => {
  it("does nothing when the event is ignored", async () => {
    state.outcome = { kind: "ignored" };
    await handleSubscriptionEvent(snapshot, provider);
    expect(cancel).not.toHaveBeenCalled();
    expect(state.restamped).toEqual([]);
    expect(state.purged).toEqual([]);
  });

  it("restamps pro and purges the portal on an upgrade", async () => {
    state.outcome = applied({ previousTier: "standard", nextTier: "pro" });
    await handleSubscriptionEvent(snapshot, provider);
    expect(cancel).not.toHaveBeenCalled();
    expect(state.restamped).toEqual([{ slug: "acme", tier: "pro" }]);
    expect(state.purged).toEqual(["acme"]);
  });

  it("restamps standard and purges the portal on a cancel", async () => {
    state.outcome = applied({ previousTier: "pro", nextTier: "standard" });
    await handleSubscriptionEvent(snapshot, provider);
    expect(cancel).not.toHaveBeenCalled();
    expect(state.restamped).toEqual([{ slug: "acme", tier: "standard" }]);
    expect(state.purged).toEqual(["acme"]);
  });

  it("no-ops the restamp when the user has no published slug", async () => {
    state.draftRows = [];
    state.outcome = applied({ previousTier: "standard", nextTier: "pro" });
    await handleSubscriptionEvent(snapshot, provider);
    expect(state.restamped).toEqual([]);
    expect(state.purged).toEqual([]);
  });

  it("cancels exactly the superseded subscription when a new active sub replaces it", async () => {
    state.outcome = applied({
      previousTier: "standard",
      nextTier: "pro",
      supersededSubscriptionId: "sub_old",
    });
    await handleSubscriptionEvent(snapshot, provider);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith("sub_old");
  });

  it("does not cancel anything when there is no prior subscription", async () => {
    state.outcome = applied({
      previousTier: "standard",
      nextTier: "pro",
      supersededSubscriptionId: null,
    });
    await handleSubscriptionEvent(snapshot, provider);
    expect(cancel).not.toHaveBeenCalled();
  });
});
