import { describe, expect, it } from "vitest";
import { bakeryConfig, wholesaleConfig } from "./fixtures";
import { parsePortalConfig } from "./parse";
import type { PortalConfig } from "./types";

const clone = (config: PortalConfig): PortalConfig => structuredClone(config);

const firstProduct = (config: PortalConfig) => {
  const product = config.catalog.tables[0]?.products[0];
  if (!product) throw new Error("fixture missing a product");
  return product;
};

const messages = (input: unknown): string => {
  const result = parsePortalConfig(input);
  if (result.ok) throw new Error("expected the config to be rejected");
  return result.error.details.map((detail) => detail.message).join(" ");
};

describe("schema rigor probe matrix", () => {
  it("rejects a negative money amount", () => {
    const config = clone(bakeryConfig);
    firstProduct(config).unitPrice.amount = -1;
    expect(parsePortalConfig(config).ok).toBe(false);
  });

  it("rejects unsorted tiers", () => {
    const config = clone(wholesaleConfig);
    const rule = config.rules.find((candidate) => candidate.type === "tier-pricing");
    if (rule?.type !== "tier-pricing") throw new Error("fixture missing a tier-pricing rule");
    rule.tiers = [rule.tiers[2], rule.tiers[0], rule.tiers[1]].filter(
      (tier): tier is NonNullable<typeof tier> => tier !== undefined,
    );
    expect(messages(config)).toContain("ascending");
  });

  it("rejects duplicate minQuantity values in tiers", () => {
    const config = clone(wholesaleConfig);
    const rule = config.rules.find((candidate) => candidate.type === "tier-pricing");
    if (rule?.type !== "tier-pricing") throw new Error("fixture missing a tier-pricing rule");
    const second = rule.tiers[1];
    if (second) second.minQuantity = 1;
    expect(messages(config)).toContain("ascending");
  });

  it("rejects tiers that do not start at minQuantity 1", () => {
    const config = clone(wholesaleConfig);
    const rule = config.rules.find((candidate) => candidate.type === "tier-pricing");
    if (rule?.type !== "tier-pricing") throw new Error("fixture missing a tier-pricing rule");
    const first = rule.tiers[0];
    if (first) first.minQuantity = 5;
    expect(messages(config)).toContain("minQuantity 1");
  });

  it("rejects a currency mismatch across prices", () => {
    const config = clone(bakeryConfig);
    firstProduct(config).unitPrice.currencyCode = "EUR";
    expect(messages(config)).toContain("currency");
  });

  it("rejects a dangling product.categoryId", () => {
    const config = clone(bakeryConfig);
    firstProduct(config).categoryId = "ghost-category";
    expect(messages(config)).toContain("category");
  });

  it("rejects a dangling rule scope reference", () => {
    const config = clone(wholesaleConfig);
    const rule = config.rules.find((candidate) => candidate.type === "tier-pricing");
    if (rule?.type !== "tier-pricing") throw new Error("fixture missing a tier-pricing rule");
    rule.scope = { target: "product", productId: "ghost-product" };
    expect(messages(config)).toContain("scope");
  });

  it("rejects a dangling finding.targetRef", () => {
    const config = clone(bakeryConfig);
    const finding = config.findings.find((candidate) => candidate.targetRef !== undefined);
    if (finding) finding.targetRef = { kind: "rule", id: "ghost-rule" };
    expect(messages(config)).toContain("targetRef");
  });

  it("rejects duplicate product ids", () => {
    const config = clone(bakeryConfig);
    const products = config.catalog.tables[0]?.products;
    if (products?.[0] && products[1]) products[1].id = products[0].id;
    expect(messages(config)).toContain("Product ids");
  });

  it("rejects duplicate rule ids", () => {
    const config = clone(wholesaleConfig);
    if (config.rules[0] && config.rules[1]) config.rules[1].id = config.rules[0].id;
    expect(messages(config)).toContain("Rule ids");
  });

  it("rejects duplicate finding ids", () => {
    const config = clone(bakeryConfig);
    if (config.findings[0] && config.findings[1]) config.findings[1].id = config.findings[0].id;
    expect(messages(config)).toContain("Finding ids");
  });

  it("rejects an unknown key at the top level", () => {
    const config = { ...clone(bakeryConfig), hallucinatedField: true };
    expect(messages(config)).toContain("hallucinatedField");
  });

  it("rejects an unknown key nested in a schema object", () => {
    const base = clone(bakeryConfig);
    const config = { ...base, business: { ...base.business, ghostField: 1 } };
    expect(messages(config)).toContain("ghostField");
  });

  it("rejects an all-low-confidence extraction with no rules", () => {
    const base = clone(bakeryConfig);
    const config = {
      ...base,
      rules: [],
      findings: base.findings.map((finding) => ({
        id: finding.id,
        confidence: "low" as const,
        plainEnglish: finding.plainEnglish,
        accepted: finding.accepted,
      })),
    };
    expect(messages(config)).toContain("rule");
  });

  it("rejects a config with zero rules and one trivial finding", () => {
    const base = clone(bakeryConfig);
    const config = {
      ...base,
      rules: [],
      findings: [
        {
          id: "f-trivial",
          confidence: "low" as const,
          plainEnglish: "Nothing conclusive.",
          accepted: false,
        },
      ],
    };
    expect(messages(config)).toContain("rule");
  });

  it("rejects duplicate style sections", () => {
    const config = clone(bakeryConfig);
    const sections = config.style.sections;
    if (sections[0]) config.style.sections = [...sections, sections[0]];
    expect(messages(config)).toContain("duplicate");
  });

  it("rejects an order-minimum subtotal threshold given as a bare number", () => {
    const base = clone(bakeryConfig);
    const config = {
      ...base,
      rules: base.rules.map((rule) =>
        rule.type === "order-minimum" ? { ...rule, threshold: 2000 } : rule,
      ),
    };
    expect(parsePortalConfig(config).ok).toBe(false);
  });

  it("accepts a zero-price product (complimentary items are deliberately allowed)", () => {
    const config = clone(bakeryConfig);
    firstProduct(config).unitPrice.amount = 0;
    expect(parsePortalConfig(config).ok).toBe(true);
  });
});
