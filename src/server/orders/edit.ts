import type { PortalConfig } from "@/portal-config";
import { buildOrder, type Order, type OrderBuyer } from "./order";

export interface EditLineInput {
  productId: string;
  quantity: number;
}

export interface ManualOrderInput {
  buyer: OrderBuyer;
  lines: readonly EditLineInput[];
}

const sumLineTotals = (order: Order): number =>
  order.lines.reduce((total, line) => total + line.lineTotal.amount, 0);

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

  const subtotalAmount = lines.reduce((total, line) => total + line.lineTotal.amount, 0);
  const taxAdded = repriced.total.amount - sumLineTotals(repriced);

  return {
    ...repriced,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: now,
    lines,
    subtotal: { currencyCode: repriced.currencyCode, amount: subtotalAmount },
    total: { currencyCode: repriced.currencyCode, amount: subtotalAmount + taxAdded },
  };
};
