import type { PortalConfig } from "@/portal-config";
import { computeTaxOnBasis, type TaxableLine } from "./compute";
import { buildOrder, type Order, type OrderBuyer } from "./order";

export interface EditLineInput {
  productId: string;
  quantity: number;
}

export interface ManualOrderInput {
  buyer: OrderBuyer;
  lines: readonly EditLineInput[];
}

export const unknownProductIds = (
  config: PortalConfig,
  lines: readonly EditLineInput[],
): string[] => {
  const known = new Set(
    config.catalog.tables.flatMap((table) => table.products.map((product) => product.id)),
  );
  const offending = new Set<string>();
  for (const line of lines) {
    if (!known.has(line.productId)) offending.add(line.productId);
  }
  return [...offending];
};

export const buildManualOrder = (
  config: PortalConfig,
  input: ManualOrderInput,
  context: { id: string; now: number },
): Order =>
  buildOrder(
    config,
    { buyer: input.buyer, lines: input.lines, buyerLinkToken: null },
    { id: context.id, now: context.now, source: "manual" },
  );

export const editOrderLines = (
  order: Order,
  config: PortalConfig,
  inputLines: readonly EditLineInput[],
  now: number,
): Order => {
  const snapshot = new Map(order.lines.map((line) => [line.productId, line]));
  const repriced = buildOrder(
    config,
    { buyer: order.buyer, lines: inputLines, buyerLinkToken: null },
    { id: order.id, now, source: order.source },
  );

  const lines = repriced.lines.map((line) => {
    const prior = snapshot.get(line.productId);
    if (prior && prior.quantity === line.quantity) return { ...prior };
    return line;
  });

  const categoryByProduct = new Map(
    config.catalog.tables.flatMap((table) =>
      table.products.map((product) => [product.id, product.categoryId] as const),
    ),
  );
  const taxable: TaxableLine[] = lines.map((line) => ({
    productId: line.productId,
    categoryId: categoryByProduct.get(line.productId),
    lineTotal: line.lineTotal,
  }));

  const { currencyCode } = repriced;
  const subtotalAmount = lines.reduce((total, line) => total + line.lineTotal.amount, 0);
  const tax = computeTaxOnBasis(config.rules, taxable);

  return {
    ...repriced,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: now,
    lines,
    subtotal: { currencyCode, amount: subtotalAmount },
    tax: tax.applied ? { currencyCode, amount: tax.display } : undefined,
    total: { currencyCode, amount: subtotalAmount + tax.added },
  };
};
