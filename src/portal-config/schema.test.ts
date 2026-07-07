import { describe, expect, it } from "vitest";
import { bakeryConfig, farmCsaConfig, portalConfigFixtures, wholesaleConfig } from "./fixtures";
import { parsePortalConfig } from "./parse";

const fixtures = [
  ["bakery", bakeryConfig],
  ["wholesale", wholesaleConfig],
  ["farm-csa", farmCsaConfig],
] as const;

describe("portalConfigSchema round-trips fixtures", () => {
  for (const [name, fixture] of fixtures) {
    it(`accepts the ${name} fixture`, () => {
      const result = parsePortalConfig(fixture);
      expect(result.ok).toBe(true);
    });

    it(`parses the ${name} fixture idempotently`, () => {
      const first = parsePortalConfig(JSON.parse(JSON.stringify(fixture)));
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      const second = parsePortalConfig(JSON.parse(JSON.stringify(first.data)));
      expect(second.ok).toBe(true);
      if (second.ok) expect(second.data).toStrictEqual(first.data);
    });
  }

  it("exposes all three fixtures in the registry", () => {
    expect(Object.keys(portalConfigFixtures)).toHaveLength(3);
  });
});

describe("portalConfigSchema rejects invalid configs", () => {
  it("rejects a wrong schema version", () => {
    const result = parsePortalConfig({ ...bakeryConfig, version: 2 });
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown templateFamily", () => {
    const result = parsePortalConfig({ ...bakeryConfig, templateFamily: "booking-portal" });
    expect(result.ok).toBe(false);
  });

  it("rejects a malformed rule", () => {
    const config = {
      ...bakeryConfig,
      rules: [
        {
          id: "bad",
          type: "tier-pricing",
          plainEnglish: "x",
          source: bakeryConfig.rules[0]?.source,
          scope: { target: "all" },
          tiers: [],
        },
      ],
    };
    const result = parsePortalConfig(config);
    expect(result.ok).toBe(false);
  });

  it("rejects a config with zero products (empty-skeleton failure class)", () => {
    const config = {
      ...bakeryConfig,
      catalog: { categories: [], tables: [] },
    };
    const result = parsePortalConfig(config);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.issues.join(" ")).toContain("at least one product");
  });

  it("rejects a config where every finding is low confidence (all-zero confidence)", () => {
    const config = {
      ...bakeryConfig,
      findings: bakeryConfig.findings.map((finding) => ({ ...finding, confidence: "low" })),
    };
    const result = parsePortalConfig(config);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.issues.join(" ")).toContain("non-low-confidence");
  });

  it("rejects an empty findings list", () => {
    const result = parsePortalConfig({ ...bakeryConfig, findings: [] });
    expect(result.ok).toBe(false);
  });

  it("reports issues as readable path strings", () => {
    const result = parsePortalConfig({ ...bakeryConfig, version: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation");
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});
