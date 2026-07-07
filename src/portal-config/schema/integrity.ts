import type { OrderPortalConfig } from "../types";
import type { Product } from "./catalog";

const allProducts = (config: OrderPortalConfig): Product[] =>
  config.catalog.tables.flatMap((table) => table.products);

const isUnique = (ids: readonly string[]): boolean => new Set(ids).size === ids.length;

export const uniqueProductIds = (config: OrderPortalConfig): boolean =>
  isUnique(allProducts(config).map((product) => product.id));

export const uniqueRuleIds = (config: OrderPortalConfig): boolean =>
  isUnique(config.rules.map((rule) => rule.id));

export const uniqueFindingIds = (config: OrderPortalConfig): boolean =>
  isUnique(config.findings.map((finding) => finding.id));

const currencyCodes = (config: OrderPortalConfig): string[] => {
  const codes: string[] = [];
  for (const product of allProducts(config)) codes.push(product.unitPrice.currencyCode);
  for (const rule of config.rules) {
    if (rule.type === "tier-pricing") {
      for (const tier of rule.tiers) codes.push(tier.unitPrice.currencyCode);
    }
    if (rule.type === "order-minimum" && rule.basis === "subtotal") {
      codes.push(rule.threshold.currencyCode);
    }
  }
  return codes;
};

export const uniformCurrency = (config: OrderPortalConfig): boolean =>
  new Set(currencyCodes(config)).size <= 1;

export const productCategoryRefsValid = (config: OrderPortalConfig): boolean => {
  const categoryIds = new Set(config.catalog.categories.map((category) => category.id));
  return allProducts(config).every(
    (product) => product.categoryId === undefined || categoryIds.has(product.categoryId),
  );
};

export const ruleScopeRefsValid = (config: OrderPortalConfig): boolean => {
  const categoryIds = new Set(config.catalog.categories.map((category) => category.id));
  const productIds = new Set(allProducts(config).map((product) => product.id));
  return config.rules.every((rule) => {
    if (!("scope" in rule)) return true;
    if (rule.scope.target === "category") return categoryIds.has(rule.scope.categoryId);
    if (rule.scope.target === "product") return productIds.has(rule.scope.productId);
    return true;
  });
};

export const findingRefsValid = (config: OrderPortalConfig): boolean => {
  const categoryIds = new Set(config.catalog.categories.map((category) => category.id));
  const productIds = new Set(allProducts(config).map((product) => product.id));
  const ruleIds = new Set(config.rules.map((rule) => rule.id));
  return config.findings.every((finding) => {
    const ref = finding.targetRef;
    if (ref === undefined) return true;
    if (ref.kind === "rule") return ruleIds.has(ref.id);
    if (ref.kind === "product") return productIds.has(ref.id);
    return categoryIds.has(ref.id);
  });
};

const productCount = (config: OrderPortalConfig): number => allProducts(config).length;

const hasConfidentFinding = (config: OrderPortalConfig): boolean =>
  config.findings.some((finding) => finding.confidence !== "low");

export const isViableSkeleton = (config: OrderPortalConfig): boolean =>
  config.rules.length > 0 || (productCount(config) > 0 && hasConfidentFinding(config));
