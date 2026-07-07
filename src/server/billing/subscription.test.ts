import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SubscriptionSnapshot } from "./provider";

interface Row {
  userId: string;
  planSlug: string;
  status: string;
  polarSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
}

const envState = vi.hoisted(() => ({ bypass: "false", plan: "standard" }));
const dbState = vi.hoisted(() => ({
  rows: [] as Row[],
  upserted: null as { values: unknown; set: unknown } | null,
}));

vi.mock("@/env", () => ({
  env: {
    get BILLING_DEV_BYPASS() {
      return envState.bypass;
    },
    get BILLING_DEV_BYPASS_PLAN() {
      return envState.plan;
    },
  },
}));

vi.mock("@/server/db", () => {
  const selectChain = {
    from: () => selectChain,
    where: () => Promise.resolve(dbState.rows),
  };
  const insert = () => ({
    values: (values: unknown) => ({
      onConflictDoUpdate: ({ set }: { set: unknown }) => {
        dbState.upserted = { values, set };
        return Promise.resolve();
      },
    }),
  });
  return { db: { select: () => selectChain, insert } };
});

import { getSubscription, hasActiveSubscription, upsertSubscription } from "./subscription";

const row = (over: Partial<Row> = {}): Row => ({
  userId: "user-1",
  planSlug: "pro",
  status: "active",
  polarSubscriptionId: "sub_1",
  currentPeriodEnd: new Date("2026-08-01T00:00:00.000Z"),
  ...over,
});

beforeEach(() => {
  envState.bypass = "false";
  envState.plan = "standard";
  dbState.rows = [];
  dbState.upserted = null;
});

describe("getSubscription", () => {
  it("returns a stored active subscription", async () => {
    dbState.rows = [row()];
    const subscription = await getSubscription("user-1");
    expect(subscription).toEqual({
      userId: "user-1",
      planSlug: "pro",
      status: "active",
      providerSubscriptionId: "sub_1",
      currentPeriodEnd: new Date("2026-08-01T00:00:00.000Z"),
    });
  });

  it("returns null when no row exists", async () => {
    dbState.rows = [];
    expect(await getSubscription("user-1")).toBeNull();
  });

  it("returns null when the stored plan or status is not recognized", async () => {
    dbState.rows = [row({ planSlug: "enterprise" })];
    expect(await getSubscription("user-1")).toBeNull();
    dbState.rows = [row({ status: "trialing" })];
    expect(await getSubscription("user-1")).toBeNull();
  });

  it("simulates an active subscription under the dev bypass", async () => {
    envState.bypass = "true";
    envState.plan = "pro";
    const subscription = await getSubscription("user-9");
    expect(subscription).toEqual({
      userId: "user-9",
      planSlug: "pro",
      status: "active",
      providerSubscriptionId: null,
      currentPeriodEnd: null,
    });
  });

  it("defaults the dev bypass plan to standard", async () => {
    envState.bypass = "true";
    const subscription = await getSubscription("user-9");
    expect(subscription?.planSlug).toBe("standard");
  });
});

describe("hasActiveSubscription", () => {
  it("is true only for an active subscription", () => {
    expect(hasActiveSubscription(null)).toBe(false);
    expect(
      hasActiveSubscription({
        userId: "u",
        planSlug: "standard",
        status: "canceled",
        providerSubscriptionId: null,
        currentPeriodEnd: null,
      }),
    ).toBe(false);
    expect(
      hasActiveSubscription({
        userId: "u",
        planSlug: "standard",
        status: "active",
        providerSubscriptionId: null,
        currentPeriodEnd: null,
      }),
    ).toBe(true);
  });
});

const snapshot = (over: Partial<SubscriptionSnapshot> = {}): SubscriptionSnapshot => ({
  userId: "user-1",
  planSlug: "pro",
  status: "active",
  providerSubscriptionId: "sub_1",
  currentPeriodEnd: new Date("2026-09-01T00:00:00.000Z"),
  ...over,
});

describe("upsertSubscription", () => {
  it("writes the normalized snapshot to the polar column", async () => {
    const outcome = await upsertSubscription(
      snapshot({ planSlug: "standard", status: "past_due", providerSubscriptionId: "sub_2" }),
    );
    expect(dbState.upserted?.values).toMatchObject({
      userId: "user-1",
      planSlug: "standard",
      status: "past_due",
      polarSubscriptionId: "sub_2",
    });
    expect(dbState.upserted?.set).toMatchObject({ planSlug: "standard", status: "past_due" });
    expect(outcome).toEqual({
      kind: "applied",
      userId: "user-1",
      previousTier: "standard",
      nextTier: "standard",
      supersededSubscriptionId: null,
    });
  });

  it("reports the effective tier change when inserting a first active subscription", async () => {
    const outcome = await upsertSubscription(snapshot());
    expect(outcome).toEqual({
      kind: "applied",
      userId: "user-1",
      previousTier: "standard",
      nextTier: "pro",
      supersededSubscriptionId: null,
    });
  });

  it("applies an updated event for the current subscription id", async () => {
    dbState.rows = [row({ planSlug: "pro", status: "active", polarSubscriptionId: "sub_1" })];
    const outcome = await upsertSubscription(
      snapshot({ planSlug: "pro", status: "past_due", providerSubscriptionId: "sub_1" }),
    );
    expect(dbState.upserted?.set).toMatchObject({ status: "past_due" });
    expect(outcome).toEqual({
      kind: "applied",
      userId: "user-1",
      previousTier: "pro",
      nextTier: "standard",
      supersededSubscriptionId: null,
    });
  });

  it("ignores a canceled event for a non-current subscription id", async () => {
    dbState.rows = [row({ planSlug: "pro", status: "active", polarSubscriptionId: "sub_new" })];
    const outcome = await upsertSubscription(
      snapshot({ status: "canceled", providerSubscriptionId: "sub_old" }),
    );
    expect(outcome).toEqual({ kind: "ignored" });
    expect(dbState.upserted).toBeNull();
  });

  it("replaces the row and supersedes the old id when an active event arrives for a new id", async () => {
    dbState.rows = [row({ planSlug: "standard", status: "active", polarSubscriptionId: "sub_old" })];
    const outcome = await upsertSubscription(
      snapshot({ planSlug: "pro", status: "active", providerSubscriptionId: "sub_new" }),
    );
    expect(dbState.upserted?.set).toMatchObject({ planSlug: "pro", polarSubscriptionId: "sub_new" });
    expect(outcome).toEqual({
      kind: "applied",
      userId: "user-1",
      previousTier: "standard",
      nextTier: "pro",
      supersededSubscriptionId: "sub_old",
    });
  });
});
