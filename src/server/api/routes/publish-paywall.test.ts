import { Elysia } from "elysia";
import { describe, expect, it, vi } from "vitest";
import type { Subscription } from "@/server/billing/subscription";

interface DraftRow {
  userId: string;
  slug: string | null;
}

const authState = vi.hoisted(() => ({
  session: null as { user: { id: string }; session: { id: string } } | null,
}));
const dbState = vi.hoisted(() => ({ rows: [] as DraftRow[] }));
const subState = vi.hoisted(() => ({ sub: null as Subscription | null }));
const agentState = vi.hoisted(() => ({ markPublished: vi.fn() }));
const storeState = vi.hoisted(() => ({
  publish: vi.fn((_slug: string, _config: unknown, _tier: string) => Promise.resolve({ ok: true })),
}));

vi.mock("cloudflare:workers", () => ({ env: { EXTRACTION: {} } }));
vi.mock("agents", () => ({
  getAgentByName: () =>
    Promise.resolve({
      snapshot: () => Promise.resolve({}),
      markPublished: agentState.markPublished,
    }),
}));
vi.mock("@/server/lib/auth", () => ({
  auth: { api: { getSession: () => Promise.resolve(authState.session) } },
}));
vi.mock("@/server/db", () => {
  const selectChain = { from: () => selectChain, where: () => Promise.resolve(dbState.rows) };
  const updateChain = { set: () => updateChain, where: () => Promise.resolve() };
  return { db: { select: () => selectChain, update: () => updateChain } };
});
vi.mock("@/server/billing/subscription", () => ({
  getSubscription: () => Promise.resolve(subState.sub),
  hasActiveSubscription: (sub: Subscription | null) => sub !== null && sub.status === "active",
}));
vi.mock("@/server/portal/store", () => ({ publishPortalConfig: storeState.publish }));
vi.mock("@/server/portal/cache", () => ({
  purgePortalCache: () => Promise.resolve(),
  portalUrlFor: (slug: string) => `https://${slug}.sheetstand.com`,
}));
vi.mock("@/server/extraction/claim", () => ({
  canClaim: () => true,
  readyConfig: () => ({ findings: [] }),
}));
vi.mock("@/review/summary", () => ({
  summarizeFindings: () => ({ questions: 0, confirmed: 0 }),
}));
vi.mock("@/review/effective-config", () => ({ deriveEffectiveConfig: (config: unknown) => config }));

import { errorPlugin } from "../errors";
import { reviewRoute } from "./review";

const app = new Elysia({ aot: false }).use(errorPlugin).use(reviewRoute);

const asUser = (id: string) => {
  authState.session = { user: { id }, session: { id: `${id}-session` } };
};

const activeSub = (planSlug: "standard" | "pro"): Subscription => ({
  userId: "user-a",
  planSlug,
  status: "active",
  polarSubscriptionId: "sub_1",
  currentPeriodEnd: null,
});

const publish = (slug: string) =>
  app.handle(
    new Request("http://localhost/review/job-1/publish", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost" },
      body: JSON.stringify({ slug }),
    }),
  );

describe("publish paywall", () => {
  it("returns 402 with checkout details when there is no active subscription", async () => {
    dbState.rows = [{ userId: "user-a", slug: null }];
    subState.sub = null;
    asUser("user-a");

    const response = await publish("northgate-store");
    expect(response.status).toBe(402);
    const body = (await response.json()) as {
      error: { code: string; details: { checkoutPath: string; plans: { slug: string }[] } };
    };
    expect(body.error.code).toBe("payment_required");
    expect(body.error.details.checkoutPath).toBe("/api/billing/checkout");
    expect(body.error.details.plans.map((plan) => plan.slug)).toEqual(["standard", "pro"]);
    expect(storeState.publish).not.toHaveBeenCalled();
  });

  it("does not paywall over a canceled subscription", async () => {
    dbState.rows = [{ userId: "user-a", slug: null }];
    subState.sub = { ...activeSub("standard"), status: "canceled" };
    asUser("user-a");

    const response = await publish("northgate-canceled");
    expect(response.status).toBe(402);
  });

  it("publishes and stamps the standard tier when the subscription is active", async () => {
    storeState.publish.mockClear();
    agentState.markPublished.mockClear();
    dbState.rows = [{ userId: "user-a", slug: null }];
    subState.sub = activeSub("standard");
    asUser("user-a");

    const response = await publish("northgate-standard");
    expect(response.status).toBe(200);
    const body = (await response.json()) as { slug: string; portalUrl: string };
    expect(body.slug).toBe("northgate-standard");
    expect(storeState.publish).toHaveBeenCalledWith(
      "northgate-standard",
      { findings: [] },
      "standard",
    );
    expect(agentState.markPublished).toHaveBeenCalledWith("northgate-standard");
  });

  it("stamps the pro tier for a pro subscriber", async () => {
    storeState.publish.mockClear();
    dbState.rows = [{ userId: "user-a", slug: null }];
    subState.sub = activeSub("pro");
    asUser("user-a");

    const response = await publish("northgate-pro");
    expect(response.status).toBe(200);
    expect(storeState.publish).toHaveBeenCalledWith("northgate-pro", { findings: [] }, "pro");
  });

  it("rejects an unauthenticated publish before the paywall", async () => {
    authState.session = null;
    const response = await publish("northgate-anon");
    expect(response.status).toBe(401);
  });
});
