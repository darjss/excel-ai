import { describe, expect, it } from "vitest";
import { type ProductPlanMap, subscriptionSnapshotFromPolar } from "./polar-webhook";

const products: ProductPlanMap = { standard: "prod_standard", pro: "prod_pro" };

const payload = (over: Partial<Parameters<typeof subscriptionSnapshotFromPolar>[0]> = {}) => ({
  id: "sub_1",
  status: "active",
  productId: "prod_pro",
  currentPeriodEnd: "2026-08-01T00:00:00.000Z",
  customer: { externalId: "user-1" },
  ...over,
});

describe("subscriptionSnapshotFromPolar", () => {
  it("maps an active pro subscription to a snapshot", () => {
    const snapshot = subscriptionSnapshotFromPolar(payload(), products);
    expect(snapshot).toEqual({
      userId: "user-1",
      planSlug: "pro",
      status: "active",
      providerSubscriptionId: "sub_1",
      currentPeriodEnd: new Date("2026-08-01T00:00:00.000Z"),
    });
  });

  it("resolves the plan slug from the product id", () => {
    const snapshot = subscriptionSnapshotFromPolar(
      payload({ productId: "prod_standard" }),
      products,
    );
    expect(snapshot?.planSlug).toBe("standard");
  });

  it("maps trialing to active and past_due/unpaid to past_due", () => {
    expect(subscriptionSnapshotFromPolar(payload({ status: "trialing" }), products)?.status).toBe(
      "active",
    );
    expect(subscriptionSnapshotFromPolar(payload({ status: "past_due" }), products)?.status).toBe(
      "past_due",
    );
    expect(subscriptionSnapshotFromPolar(payload({ status: "unpaid" }), products)?.status).toBe(
      "past_due",
    );
  });

  it("maps canceled and unknown states to canceled", () => {
    expect(subscriptionSnapshotFromPolar(payload({ status: "canceled" }), products)?.status).toBe(
      "canceled",
    );
    expect(
      subscriptionSnapshotFromPolar(payload({ status: "incomplete_expired" }), products)?.status,
    ).toBe("canceled");
  });

  it("honors a status override (revoked event)", () => {
    const snapshot = subscriptionSnapshotFromPolar(
      payload({ status: "active" }),
      products,
      "canceled",
    );
    expect(snapshot?.status).toBe("canceled");
  });

  it("returns null when the external customer id is missing", () => {
    expect(subscriptionSnapshotFromPolar(payload({ customer: null }), products)).toBeNull();
    expect(
      subscriptionSnapshotFromPolar(payload({ customer: { externalId: null } }), products),
    ).toBeNull();
  });

  it("returns null when the product is not a known plan", () => {
    expect(subscriptionSnapshotFromPolar(payload({ productId: "prod_other" }), products)).toBeNull();
  });

  it("allows a null current period end", () => {
    expect(
      subscriptionSnapshotFromPolar(payload({ currentPeriodEnd: null }), products)?.currentPeriodEnd,
    ).toBeNull();
  });
});
