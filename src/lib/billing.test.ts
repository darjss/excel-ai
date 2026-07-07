import { describe, expect, it } from "vitest";
import { deriveBillingView, toBillingStatus } from "./billing";

describe("toBillingStatus", () => {
  it("keeps known statuses and falls back to none", () => {
    expect(toBillingStatus("active")).toBe("active");
    expect(toBillingStatus("canceled")).toBe("canceled");
    expect(toBillingStatus("past_due")).toBe("past_due");
    expect(toBillingStatus("whatever")).toBe("none");
  });
});

describe("deriveBillingView", () => {
  it("describes an active standard plan and offers an upgrade", () => {
    const view = deriveBillingView({
      planSlug: "standard",
      status: "active",
      currentPeriodEnd: Date.parse("2026-08-01T00:00:00.000Z"),
    });
    expect(view.planName).toBe("Standard");
    expect(view.statusLabel).toBe("Active");
    expect(view.isActive).toBe(true);
    expect(view.canUpgrade).toBe(true);
    expect(view.periodEndLabel).not.toBeNull();
  });

  it("does not offer an upgrade on pro", () => {
    const view = deriveBillingView({ planSlug: "pro", status: "active", currentPeriodEnd: null });
    expect(view.planName).toBe("Pro");
    expect(view.canUpgrade).toBe(false);
    expect(view.periodEndLabel).toBeNull();
  });

  it("reports no plan when there is no subscription", () => {
    const view = deriveBillingView({ planSlug: null, status: "none", currentPeriodEnd: null });
    expect(view.planName).toBe("No plan");
    expect(view.statusLabel).toBe("No plan");
    expect(view.isActive).toBe(false);
    expect(view.canUpgrade).toBe(false);
  });

  it("treats a canceled plan as inactive", () => {
    const view = deriveBillingView({
      planSlug: "standard",
      status: "canceled",
      currentPeriodEnd: null,
    });
    expect(view.isActive).toBe(false);
    expect(view.canUpgrade).toBe(false);
    expect(view.statusLabel).toBe("Canceled");
  });
});
