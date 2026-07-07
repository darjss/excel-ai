import type { PortalConfig } from "@/portal-config";

const MIN_PRICED_RATIO = 0.5;

export type ViabilityReason = "no-products" | "prices-missing" | "low-confidence";

export interface ViabilityVerdict {
  viable: boolean;
  reason?: ViabilityReason;
}

export const assessViability = (config: PortalConfig): ViabilityVerdict => {
  const products = config.catalog.tables.flatMap((table) => table.products);
  if (products.length === 0) return { viable: false, reason: "no-products" };

  const priced = products.filter((product) => product.unitPrice.amount > 0).length;
  if (priced / products.length < MIN_PRICED_RATIO) return { viable: false, reason: "prices-missing" };

  const hasConfidentFinding = config.findings.some((finding) => finding.confidence !== "low");
  if (config.rules.length === 0 && !hasConfidentFinding) return { viable: false, reason: "low-confidence" };

  return { viable: true };
};
