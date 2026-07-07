import { t } from "elysia";
import { MAX_LINE_QUANTITY } from "@/lib/order-limits";
import { CURSOR_PATTERN, MAX_ORDERS_PAGE_SIZE } from "./pagination";

const moneyT = t.Object({ currencyCode: t.String(), amount: t.Integer() });

const orderLineT = t.Object({
  productId: t.String(),
  name: t.String(),
  unit: t.Optional(t.String()),
  quantity: t.Integer(),
  unitPrice: moneyT,
  lineTotal: moneyT,
  appliedRule: t.Optional(t.String()),
  available: t.Boolean(),
});

const violationT = t.Object({ ruleId: t.String(), message: t.String() });

export const orderStatusT = t.Union([
  t.Literal("received"),
  t.Literal("confirmed"),
  t.Literal("fulfilled"),
  t.Literal("cancelled"),
]);

export const orderT = t.Object({
  id: t.String(),
  status: orderStatusT,
  buyer: t.Object({ name: t.String(), contact: t.String() }),
  lines: t.Array(orderLineT),
  subtotal: moneyT,
  tax: t.Optional(moneyT),
  total: moneyT,
  paymentInstructions: t.String(),
  violations: t.Array(violationT),
  currencyCode: t.String(),
  source: t.Union([t.Literal("portal"), t.Literal("manual")]),
  buyerLinkToken: t.Optional(t.String()),
  buyerLinkName: t.Optional(t.String()),
  createdAt: t.Integer(),
  updatedAt: t.Integer(),
});

export const ordersPageT = t.Object({
  orders: t.Array(orderT),
  nextCursor: t.Nullable(t.String()),
});

export const listOrdersQueryT = t.Object({
  cursor: t.Optional(t.String({ pattern: CURSOR_PATTERN })),
  take: t.Optional(t.Integer({ minimum: 1, maximum: MAX_ORDERS_PAGE_SIZE })),
});

export const updateStatusBodyT = t.Object({ status: orderStatusT });

const lineInputT = t.Object({
  productId: t.String({ minLength: 1 }),
  quantity: t.Integer({ minimum: 1, maximum: MAX_LINE_QUANTITY }),
});

export const editLinesBodyT = t.Object({
  lines: t.Array(lineInputT, { minItems: 1 }),
});

export const manualOrderBodyT = t.Object({
  buyer: t.Object({
    name: t.String({ minLength: 1, maxLength: 200 }),
    contact: t.String({ minLength: 1, maxLength: 200 }),
  }),
  lines: t.Array(lineInputT, { minItems: 1 }),
});
