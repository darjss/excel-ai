import { describe, expect, it } from "vitest";
import { bakeryConfig } from "@/portal-config";
import { catalogProducts, categoryNames, matchesQuery } from "./catalog-data";

describe("catalog-data", () => {
  it("flattens products across catalog tables", () => {
    const products = catalogProducts(bakeryConfig);
    expect(products.map((product) => product.id)).toContain("sourdough-classic");
  });

  it("maps category ids to names", () => {
    expect(categoryNames(bakeryConfig).get("breads")).toBe("Breads");
  });

  it("matches on an empty query", () => {
    const product = catalogProducts(bakeryConfig).find((item) => item.id === "sourdough-classic");
    expect(product).toBeDefined();
    if (!product) return;
    expect(matchesQuery(product, "Breads", "")).toBe(true);
  });

  it("matches on name substrings, case-insensitively", () => {
    const product = catalogProducts(bakeryConfig).find((item) => item.id === "rye-loaf");
    expect(product).toBeDefined();
    if (!product) return;
    expect(matchesQuery(product, "Breads", "rye")).toBe(true);
    expect(matchesQuery(product, "Breads", "croissant")).toBe(false);
  });

  it("matches on category name", () => {
    const product = catalogProducts(bakeryConfig).find((item) => item.id === "butter-croissant");
    expect(product).toBeDefined();
    if (!product) return;
    expect(matchesQuery(product, "Pastries", "pastr")).toBe(true);
  });
});
