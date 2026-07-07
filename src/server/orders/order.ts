import type { Money, PortalConfig, Product } from "@/portal-config";
import type { OrderAttribution } from "./buyer-links";
import { type CartLineInput, computeTotals, type Violation } from "./compute";

export type OrderStatus = "received" | "confirmed" | "fulfilled" | "cancelled";
export type OrderSource = "portal" | "manual";

export interface OrderBuyer {
  name: string;
  contact: string;
}

export interface OrderLine {
  productId: string;
  name: string;
  unit?: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  appliedRule?: string;
  available: boolean;
}

export interface Order {
  id: string;
  status: OrderStatus;
  buyer: OrderBuyer;
  lines: OrderLine[];
  subtotal: Money;
  tax?: Money;
  total: Money;
  paymentInstructions: string;
  violations: Violation[];
  currencyCode: string;
  source: OrderSource;
  buyerLinkToken?: string;
  buyerLinkName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SubmitOrderInput {
  buyer: OrderBuyer;
  lines: readonly { productId: string; quantity: number }[];
  buyerLinkToken?: string | null;
}

export type SubmitOrderResult =
  | { kind: "ok"; order: Order }
  | { kind: "violations"; violations: Violation[] }
  | { kind: "not-published" }
  | { kind: "invalid-link" };

export interface BuildOrderContext {
  id: string;
  now: number;
  source: OrderSource;
  attribution?: OrderAttribution | null;
}

const productIndex = (config: PortalConfig): Map<string, Product> =>
  new Map(config.catalog.tables.flatMap((table) => table.products.map((p) => [p.id, p])));

const sanitizeText = (value: string): string => value.replace(/[\r\n]+/g, " ").trim();

const mergeLines = (
  lines: SubmitOrderInput["lines"],
): { productId: string; quantity: number }[] => {
  const merged = new Map<string, number>();
  for (const line of lines) {
    merged.set(line.productId, (merged.get(line.productId) ?? 0) + line.quantity);
  }
  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
};

export const buildOrder = (
  config: PortalConfig,
  input: SubmitOrderInput,
  context: BuildOrderContext,
): Order => {
  const products = productIndex(config);
  const mergedLines = mergeLines(input.lines);
  const cartLines: CartLineInput[] = [];
  const removed: SubmitOrderInput["lines"][number][] = [];

  for (const line of mergedLines) {
    const product = products.get(line.productId);
    if (!product) {
      removed.push(line);
      continue;
    }
    cartLines.push({
      productId: product.id,
      name: product.name,
      unit: product.unit,
      categoryId: product.categoryId,
      unitPrice: product.unitPrice,
      quantity: line.quantity,
    });
  }

  const totals = computeTotals(config.rules, { lines: cartLines });
  const computedByProduct = new Map(totals.lines.map((line) => [line.productId, line]));

  const lines: OrderLine[] = mergedLines.map((line) => {
    const computed = computedByProduct.get(line.productId);
    if (computed) {
      return {
        productId: computed.productId,
        name: computed.name,
        unit: computed.unit,
        quantity: computed.quantity,
        unitPrice: computed.unitPrice,
        lineTotal: computed.lineTotal,
        appliedRule: computed.appliedRule,
        available: true,
      };
    }
    return {
      productId: line.productId,
      name: line.productId,
      quantity: line.quantity,
      unitPrice: { currencyCode: totals.currencyCode, amount: 0 },
      lineTotal: { currencyCode: totals.currencyCode, amount: 0 },
      available: false,
    };
  });

  return {
    id: context.id,
    status: "received",
    buyer: {
      name: sanitizeText(input.buyer.name),
      contact: sanitizeText(input.buyer.contact),
    },
    lines,
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    paymentInstructions: config.business.paymentInstructions,
    violations: totals.violations,
    currencyCode: totals.currencyCode,
    source: context.source,
    ...(context.attribution
      ? { buyerLinkToken: context.attribution.token, buyerLinkName: context.attribution.buyerName }
      : {}),
    createdAt: context.now,
    updatedAt: context.now,
  };
};
