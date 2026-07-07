import { describe, expect, it } from "vitest";
import type { Money, Rule } from "@/portal-config";
import { type CartLineInput, computeTotals } from "./compute";

const usd = (amount: number): Money => ({ currencyCode: "USD", amount });
const source = { sheet: "Sheet", range: "A1" };

const line = (over: Partial<CartLineInput> & Pick<CartLineInput, "productId" | "unitPrice" | "quantity">): CartLineInput => ({
  name: over.productId,
  ...over,
});

const lineTotalRule: Rule = {
  id: "line-total",
  type: "line-total",
  plainEnglish: "price x quantity",
  source,
};

const tierFlour: Rule = {
  id: "tier-flour",
  type: "tier-pricing",
  plainEnglish: "Flour drops in price at volume.",
  source,
  scope: { target: "product", productId: "flour" },
  tiers: [
    { minQuantity: 1, unitPrice: usd(4200) },
    { minQuantity: 10, unitPrice: usd(4000) },
    { minQuantity: 25, unitPrice: usd(3800) },
  ],
};

const taxAll8: Rule = {
  id: "tax",
  type: "tax",
  plainEnglish: "8% sales tax on everything.",
  source,
  scope: { target: "all" },
  ratePercent: 8,
  inclusive: false,
};

const minSubtotal2000: Rule = {
  id: "min-subtotal",
  type: "order-minimum",
  plainEnglish: "Orders must total at least $20.",
  source,
  scope: { target: "all" },
  basis: "subtotal",
  threshold: usd(2000),
};

const minGrains5: Rule = {
  id: "min-grains",
  type: "order-minimum",
  plainEnglish: "Grain orders require at least 5 cases.",
  source,
  scope: { target: "category", categoryId: "grains" },
  basis: "quantity",
  threshold: 5,
};

describe("computeTotals — base pricing", () => {
  it("prices lines from the catalog unit price when no rules apply", () => {
    const totals = computeTotals([], {
      lines: [line({ productId: "croissant", unitPrice: usd(375), quantity: 2 })],
    });
    expect(totals.subtotal).toEqual(usd(750));
    expect(totals.total).toEqual(usd(750));
    expect(totals.tax).toBeUndefined();
    expect(totals.violations).toEqual([]);
    expect(totals.lines[0]?.lineTotal).toEqual(usd(750));
    expect(totals.lines[0]?.appliedRule).toBeUndefined();
  });

  it("returns zeroed totals for an empty cart", () => {
    const totals = computeTotals([lineTotalRule, taxAll8], { lines: [] });
    expect(totals.subtotal).toEqual(usd(0));
    expect(totals.total).toEqual(usd(0));
    expect(totals.tax).toEqual(usd(0));
    expect(totals.currencyCode).toBe("USD");
  });
});

describe("computeTotals — tier pricing", () => {
  it.each([
    { quantity: 5, unit: 4200, lineTotal: 21000 },
    { quantity: 10, unit: 4000, lineTotal: 40000 },
    { quantity: 25, unit: 3800, lineTotal: 95000 },
  ])("selects the $unit tier at quantity $quantity", ({ quantity, unit, lineTotal }) => {
    const totals = computeTotals([tierFlour], {
      lines: [line({ productId: "flour", categoryId: "grains", unitPrice: usd(4200), quantity })],
    });
    expect(totals.lines[0]?.unitPrice).toEqual(usd(unit));
    expect(totals.lines[0]?.lineTotal).toEqual(usd(lineTotal));
    expect(totals.lines[0]?.appliedRule).toBe("tier-flour");
    expect(totals.subtotal).toEqual(usd(lineTotal));
  });

  it("prefers a product-scoped tier over a category-scoped tier", () => {
    const categoryTier: Rule = {
      id: "tier-grains",
      type: "tier-pricing",
      plainEnglish: "Grains discount.",
      source,
      scope: { target: "category", categoryId: "grains" },
      tiers: [{ minQuantity: 1, unitPrice: usd(9999) }],
    };
    const totals = computeTotals([categoryTier, tierFlour], {
      lines: [line({ productId: "flour", categoryId: "grains", unitPrice: usd(4200), quantity: 10 })],
    });
    expect(totals.lines[0]?.appliedRule).toBe("tier-flour");
    expect(totals.lines[0]?.unitPrice).toEqual(usd(4000));
  });
});

describe("computeTotals — tax", () => {
  it("adds exclusive tax on top of the subtotal", () => {
    const totals = computeTotals([taxAll8], {
      lines: [line({ productId: "tomatoes", unitPrice: usd(1650), quantity: 1 })],
    });
    expect(totals.subtotal).toEqual(usd(1650));
    expect(totals.tax).toEqual(usd(132));
    expect(totals.total).toEqual(usd(1782));
  });

  it("reports inclusive tax as a portion without adding to the total", () => {
    const taxInclusive: Rule = {
      id: "tax-inc",
      type: "tax",
      plainEnglish: "10% tax included in prices.",
      source,
      scope: { target: "all" },
      ratePercent: 10,
      inclusive: true,
    };
    const totals = computeTotals([taxInclusive], {
      lines: [line({ productId: "widget", unitPrice: usd(1100), quantity: 1 })],
    });
    expect(totals.subtotal).toEqual(usd(1100));
    expect(totals.tax).toEqual(usd(100));
    expect(totals.total).toEqual(usd(1100));
  });
});

describe("computeTotals — order minimums", () => {
  it("flags a subtotal below the minimum and clears it once met", () => {
    const below = computeTotals([minSubtotal2000], {
      lines: [line({ productId: "croissant", unitPrice: usd(375), quantity: 4 })],
    });
    expect(below.subtotal).toEqual(usd(1500));
    expect(below.violations).toEqual([
      { ruleId: "min-subtotal", message: "Orders must total at least $20." },
    ]);

    const met = computeTotals([minSubtotal2000], {
      lines: [line({ productId: "croissant", unitPrice: usd(375), quantity: 8 })],
    });
    expect(met.subtotal).toEqual(usd(3000));
    expect(met.violations).toEqual([]);
  });

  it("flags a scoped quantity minimum by category", () => {
    const below = computeTotals([minGrains5], {
      lines: [line({ productId: "flour", categoryId: "grains", unitPrice: usd(4200), quantity: 3 })],
    });
    expect(below.violations).toEqual([
      { ruleId: "min-grains", message: "Grain orders require at least 5 cases." },
    ]);

    const met = computeTotals([minGrains5], {
      lines: [line({ productId: "flour", categoryId: "grains", unitPrice: usd(4200), quantity: 5 })],
    });
    expect(met.violations).toEqual([]);
  });
});

describe("computeTotals — combined rules", () => {
  it("applies tier, tax, and minimum together", () => {
    const totals = computeTotals([lineTotalRule, tierFlour, taxAll8, minGrains5], {
      lines: [
        line({ productId: "flour", categoryId: "grains", unitPrice: usd(4200), quantity: 10 }),
        line({ productId: "tomatoes", categoryId: "canned", unitPrice: usd(1650), quantity: 1 }),
      ],
    });
    expect(totals.subtotal).toEqual(usd(41650));
    expect(totals.tax).toEqual(usd(3332));
    expect(totals.total).toEqual(usd(44982));
    expect(totals.violations).toEqual([]);
    expect(totals.lines[0]?.appliedRule).toBe("tier-flour");
    expect(totals.lines[0]?.unitPrice).toEqual(usd(4000));
    expect(totals.lines[1]?.appliedRule).toBeUndefined();
  });
});
