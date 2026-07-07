import { t } from "elysia";
import { MAX_LINE_QUANTITY } from "@/lib/order-limits";

export const submitBodyT = t.Object({
  buyer: t.Object({
    name: t.String({ minLength: 1, maxLength: 200 }),
    contact: t.String({ minLength: 1, maxLength: 200 }),
  }),
  lines: t.Array(
    t.Object({
      productId: t.String({ minLength: 1 }),
      quantity: t.Integer({ minimum: 1, maximum: MAX_LINE_QUANTITY }),
    }),
    { minItems: 1 },
  ),
  buyerLinkToken: t.Optional(t.Nullable(t.String())),
});
