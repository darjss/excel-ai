import type { Catalog, PortalConfig, Product } from "@/portal-config";

export type Category = Catalog["categories"][number];

export const catalogProducts = (config: PortalConfig): Product[] =>
  config.catalog.tables.flatMap((table) => table.products);

export const categoryNames = (config: PortalConfig): Map<string, string> =>
  new Map(config.catalog.categories.map((category) => [category.id, category.name]));

export const matchesQuery = (product: Product, categoryName: string | undefined, query: string) => {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;
  const haystack = [product.name, product.sku ?? "", product.unit ?? "", categoryName ?? ""]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
};
