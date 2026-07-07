import { Elysia, t } from "elysia";
import { env } from "@/env";
import { portalConfigFixtures } from "@/portal-config";
import {
  getPortalOrder,
  listPortalOrders,
  submitPortalOrder,
} from "@/server/portal/orders";
import { publishPortalConfig } from "@/server/portal/store";
import { ConflictError, NotFoundError } from "../errors";

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

const orderT = t.Object({
  id: t.String(),
  status: t.Union([
    t.Literal("received"),
    t.Literal("confirmed"),
    t.Literal("fulfilled"),
    t.Literal("cancelled"),
  ]),
  buyer: t.Object({ name: t.String(), contact: t.String() }),
  lines: t.Array(orderLineT),
  subtotal: moneyT,
  tax: t.Optional(moneyT),
  total: moneyT,
  paymentInstructions: t.String(),
  violations: t.Array(violationT),
  currencyCode: t.String(),
  source: t.Union([t.Literal("portal"), t.Literal("manual")]),
  createdAt: t.Integer(),
  updatedAt: t.Integer(),
});

const submitBodyT = t.Object({
  buyer: t.Object({
    name: t.String({ minLength: 1, maxLength: 200 }),
    contact: t.String({ minLength: 1, maxLength: 200 }),
  }),
  lines: t.Array(
    t.Object({ productId: t.String({ minLength: 1 }), quantity: t.Integer({ minimum: 1 }) }),
    { minItems: 1 },
  ),
  buyerLinkToken: t.Optional(t.Union([t.String(), t.Null()])),
});

const submitResponseT = t.Union([
  t.Object({ ok: t.Literal(true), order: orderT }),
  t.Object({ ok: t.Literal(false), violations: t.Array(violationT) }),
]);

export const portalRoute = new Elysia()
  .post(
    "/portal/seed",
    async () => {
      if (env.PORTAL_SEED_ENABLED !== "true") {
        throw new NotFoundError("Portal seed endpoint is disabled");
      }

      const seeded: string[] = [];
      for (const [slug, config] of Object.entries(portalConfigFixtures)) {
        const result = await publishPortalConfig(slug, config);
        if (!result.ok) {
          throw new ConflictError(`Fixture ${slug} failed validation: ${result.error.message}`);
        }
        seeded.push(slug);
      }
      return { seeded };
    },
    {
      response: t.Object({
        seeded: t.Array(t.String()),
      }),
    },
  )
  .post(
    "/portal/:slug/orders",
    async ({ params, body }) => {
      const result = await submitPortalOrder(params.slug, body);
      if (result.kind === "not-published") throw new NotFoundError("Portal not found");
      if (result.kind === "violations") return { ok: false as const, violations: result.violations };
      return { ok: true as const, order: result.order };
    },
    { body: submitBodyT, response: submitResponseT },
  )
  .get(
    "/portal/:slug/orders",
    ({ params }) => listPortalOrders(params.slug),
    { response: t.Array(orderT) },
  )
  .get(
    "/portal/:slug/orders/:id",
    async ({ params }) => {
      const order = await getPortalOrder(params.slug, params.id);
      if (!order) throw new NotFoundError("Order not found");
      return order;
    },
    { response: orderT },
  );
