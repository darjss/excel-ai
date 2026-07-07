import { describe, expect, it } from "vitest";
import { entitlementsFor, isPlanSlug, planBySlug } from "./plans";

describe("plan entitlements", () => {
  it("keeps the badge and slower import on standard", () => {
    expect(entitlementsFor("standard")).toEqual({
      badgeRemoved: false,
      customDomain: false,
      fastImport: false,
    });
  });

  it("removes the badge and unlocks pro entitlements on pro", () => {
    expect(entitlementsFor("pro")).toEqual({
      badgeRemoved: true,
      customDomain: true,
      fastImport: true,
    });
  });

  it("falls back to standard entitlements for an unknown plan", () => {
    expect(entitlementsFor("enterprise").badgeRemoved).toBe(false);
  });

  it("recognizes and resolves known plan slugs", () => {
    expect(isPlanSlug("pro")).toBe(true);
    expect(isPlanSlug("nope")).toBe(false);
    expect(planBySlug("standard")?.priceMonthly).toBe(29);
    expect(planBySlug("pro")?.priceMonthly).toBe(49);
    expect(planBySlug("nope")).toBeNull();
  });
});
