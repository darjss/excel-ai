import { describe, expect, it } from "vitest";
import type { PortalConfig } from "@/portal-config";
import { bakeryConfig } from "@/portal-config";
import { buildManualOrder, editOrderLines, unknownProductIds } from "./edit";
import { buildOrder, type SubmitOrderInput } from "./order";

const buyer = { name: "Sam Buyer", contact: "sam@example.com" };

const submit = (lines: SubmitOrderInput["lines"]): SubmitOrderInput => ({
  buyer,
  lines,
  buyerLinkToken: null,
});

const withRaisedPrices = (): PortalConfig => {
  const raised = structuredClone(bakeryConfig);
  const products = raised.catalog.tables[0]?.products ?? [];
  for (const product of products) {
    if (product.id === "sourdough-classic") product.unitPrice = { currencyCode: "USD", amount: 900 };
    if (product.id === "rye-loaf") product.unitPrice = { currencyCode: "USD", amount: 1000 };
  }
  return raised;
};

const original = buildOrder(
  bakeryConfig,
  submit([
    { productId: "sourdough-classic", quantity: 4 },
    { productId: "rye-loaf", quantity: 2 },
  ]),
  { id: "order-1", now: 1_700_000_000_000, source: "portal" },
);

describe("editOrderLines repricing semantics", () => {
  it("keeps the snapshot price for an unchanged line and reprices a changed line at the current catalog", () => {
    const edited = editOrderLines(
      original,
      withRaisedPrices(),
      [
        { productId: "sourdough-classic", quantity: 4 },
        { productId: "rye-loaf", quantity: 3 },
      ],
      1_700_000_100_000,
    );

    const sourdough = edited.lines.find((line) => line.productId === "sourdough-classic");
    const rye = edited.lines.find((line) => line.productId === "rye-loaf");

    expect(sourdough?.unitPrice.amount).toBe(650);
    expect(sourdough?.lineTotal.amount).toBe(2600);
    expect(rye?.unitPrice.amount).toBe(1000);
    expect(rye?.lineTotal.amount).toBe(3000);
    expect(edited.subtotal.amount).toBe(5600);
    expect(edited.total.amount).toBe(5600);
  });

  it("reprices a brand-new line at the current catalog", () => {
    const edited = editOrderLines(
      original,
      withRaisedPrices(),
      [
        { productId: "sourdough-classic", quantity: 4 },
        { productId: "butter-croissant", quantity: 2 },
      ],
      1_700_000_100_000,
    );
    const croissant = edited.lines.find((line) => line.productId === "butter-croissant");
    expect(croissant?.unitPrice.amount).toBe(375);
    expect(croissant?.lineTotal.amount).toBe(750);
  });

  it("drops a removed line and recomputes the total from the remaining lines", () => {
    const edited = editOrderLines(
      original,
      bakeryConfig,
      [{ productId: "sourdough-classic", quantity: 4 }],
      1_700_000_100_000,
    );
    expect(edited.lines).toHaveLength(1);
    expect(edited.subtotal.amount).toBe(2600);
  });

  it("preserves status, id and createdAt while advancing updatedAt", () => {
    const confirmed = { ...original, status: "confirmed" as const };
    const edited = editOrderLines(
      confirmed,
      bakeryConfig,
      [{ productId: "sourdough-classic", quantity: 5 }],
      1_700_000_200_000,
    );
    expect(edited.status).toBe("confirmed");
    expect(edited.id).toBe("order-1");
    expect(edited.createdAt).toBe(original.createdAt);
    expect(edited.updatedAt).toBe(1_700_000_200_000);
  });
});

const withTaxAndDrift = (): PortalConfig => {
  const drifted = structuredClone(bakeryConfig);
  for (const product of drifted.catalog.tables[0]?.products ?? []) {
    if (product.id === "sourdough-classic") product.unitPrice = { currencyCode: "USD", amount: 900 };
    if (product.id === "butter-croissant") product.unitPrice = { currencyCode: "USD", amount: 500 };
  }
  drifted.rules.push({
    id: "tax-breads",
    type: "tax",
    plainEnglish: "10% tax on breads.",
    source: { sheet: "Menu", range: "B14" },
    scope: { target: "category", categoryId: "breads" },
    ratePercent: 10,
    inclusive: false,
  });
  return drifted;
};

describe("editOrderLines mixed-era tax basis", () => {
  it("taxes the mixed snapshot/current lines, not the all-current repriced order", () => {
    const mixed = buildOrder(
      bakeryConfig,
      submit([
        { productId: "sourdough-classic", quantity: 4 },
        { productId: "butter-croissant", quantity: 2 },
      ]),
      { id: "order-tax", now: 1_700_000_000_000, source: "portal" },
    );

    const edited = editOrderLines(
      mixed,
      withTaxAndDrift(),
      [
        { productId: "sourdough-classic", quantity: 4 },
        { productId: "butter-croissant", quantity: 3 },
      ],
      1_700_000_100_000,
    );

    const sourdough = edited.lines.find((line) => line.productId === "sourdough-classic");
    const croissant = edited.lines.find((line) => line.productId === "butter-croissant");
    expect(sourdough?.lineTotal.amount).toBe(2600);
    expect(croissant?.lineTotal.amount).toBe(1500);

    const subtotal = edited.lines.reduce((sum, line) => sum + line.lineTotal.amount, 0);
    expect(edited.subtotal.amount).toBe(subtotal);
    expect(subtotal).toBe(4100);
    expect(edited.tax?.amount).toBe(260);
    expect(edited.total.amount).toBe(4360);
  });
});

describe("unknownProductIds", () => {
  it("returns an empty list when every line maps to a catalog product", () => {
    expect(
      unknownProductIds(bakeryConfig, [
        { productId: "sourdough-classic", quantity: 1 },
        { productId: "rye-loaf", quantity: 2 },
      ]),
    ).toEqual([]);
  });

  it("returns the deduplicated offending ids for unknown products", () => {
    expect(
      unknownProductIds(bakeryConfig, [
        { productId: "sourdough-classic", quantity: 1 },
        { productId: "ghost-item", quantity: 2 },
        { productId: "ghost-item", quantity: 1 },
        { productId: "phantom", quantity: 1 },
      ]),
    ).toEqual(["ghost-item", "phantom"]);
  });
});

describe("buildManualOrder", () => {
  it("builds a first-class order marked as a manual source", () => {
    const order = buildManualOrder(
      bakeryConfig,
      { buyer: { name: "Phone Buyer", contact: "+1 555 0000" }, lines: [{ productId: "rye-loaf", quantity: 4 }] },
      { id: "manual-1", now: 1_700_000_000_000 },
    );
    expect(order.source).toBe("manual");
    expect(order.status).toBe("received");
    expect(order.lines[0]?.lineTotal.amount).toBe(2800);
    expect(order.total.amount).toBe(2800);
  });
});
