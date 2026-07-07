import { describe, expect, it } from "vitest";
import { wholesaleConfig } from "@/portal-config";
import { assessViability } from "./viability";

describe("assessViability", () => {
  it("accepts a full priced catalog", () => {
    expect(assessViability(wholesaleConfig)).toEqual({ viable: true });
  });

  it("rejects a catalog with no products", () => {
    const empty = structuredClone(wholesaleConfig);
    empty.catalog.tables = empty.catalog.tables.map((table) => ({ ...table, products: [] }));
    expect(assessViability(empty)).toEqual({ viable: false, reason: "no-products" });
  });

  it("rejects a catalog where most products have no price", () => {
    const unpriced = structuredClone(wholesaleConfig);
    unpriced.catalog.tables = unpriced.catalog.tables.map((table) => ({
      ...table,
      products: table.products.map((product) => ({
        ...product,
        unitPrice: { ...product.unitPrice, amount: 0 },
      })),
    }));
    expect(assessViability(unpriced)).toEqual({ viable: false, reason: "prices-missing" });
  });
});
