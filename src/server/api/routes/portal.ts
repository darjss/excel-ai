import { Elysia, t } from "elysia";
import { env } from "@/env";
import { portalConfigFixtures } from "@/portal-config";
import { submitBodyT } from "@/server/orders/submit-schema";
import { createSupplierBuyerLink, listSupplierBuyerLinks } from "@/server/portal/buyer-links";
import { submitPortalOrder } from "@/server/portal/orders";
import { publishPortalConfig } from "@/server/portal/store";
import { ConflictError, NotFoundError } from "../errors";

const BUYER_LINK_INVALID_MESSAGE =
  "This order link is no longer active. Please ask your supplier for a fresh link.";

const SEED_BUYER_NAME = "Cafe Rosa";
const SEED_BUYER_CONTACT = "orders@caferosa.example";

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
  buyerLinkToken: t.Optional(t.String()),
  buyerLinkName: t.Optional(t.String()),
  createdAt: t.Integer(),
  updatedAt: t.Integer(),
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
      const buyerLinks: { slug: string; token: string }[] = [];
      for (const [slug, config] of Object.entries(portalConfigFixtures)) {
        const result = await publishPortalConfig(slug, config);
        if (!result.ok) {
          throw new ConflictError(`Fixture ${slug} failed validation: ${result.error.message}`);
        }
        seeded.push(slug);
        const existing = await listSupplierBuyerLinks(slug);
        const reusable = existing.find(
          (link) => link.buyerName === SEED_BUYER_NAME && link.revokedAt == null,
        );
        const link =
          reusable ?? (await createSupplierBuyerLink(slug, SEED_BUYER_NAME, SEED_BUYER_CONTACT));
        buyerLinks.push({ slug, token: link.token });
      }
      return { seeded, buyerLinks };
    },
    {
      response: t.Object({
        seeded: t.Array(t.String()),
        buyerLinks: t.Array(t.Object({ slug: t.String(), token: t.String() })),
      }),
    },
  )
  .post(
    "/portal/:slug/orders",
    async ({ params, body }) => {
      const result = await submitPortalOrder(params.slug, body);
      if (result.kind === "not-published") throw new NotFoundError("Portal not found");
      if (result.kind === "invalid-link") throw new ConflictError(BUYER_LINK_INVALID_MESSAGE);
      if (result.kind === "violations") return { ok: false as const, violations: result.violations };
      return { ok: true as const, order: result.order };
    },
    { body: submitBodyT, response: submitResponseT },
  );
