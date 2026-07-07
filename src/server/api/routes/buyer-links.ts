import { Elysia, t } from "elysia";
import {
  createSupplierBuyerLink,
  listSupplierBuyerLinks,
  revokeSupplierBuyerLink,
} from "@/server/portal/buyer-links";
import { assertSlugOwnership } from "@/server/portal/ownership";
import { listUserPortalSlugs } from "@/server/portal/slugs";
import { NotFoundError } from "../errors";
import { authPlugin } from "../plugins/auth";

const createBody = t.Object({
  buyerName: t.String({ minLength: 1, maxLength: 200 }),
  contact: t.Optional(t.String({ maxLength: 200 })),
});

export const buyerLinksRoute = new Elysia({ prefix: "/buyer-links" })
  .use(authPlugin)
  .get(
    "/portals",
    ({ user }) => listUserPortalSlugs(user.id),
    { requireAuth: true },
  )
  .get(
    "/:slug",
    async ({ user, params }) => {
      await assertSlugOwnership(user.id, params.slug);
      return listSupplierBuyerLinks(params.slug);
    },
    { requireAuth: true },
  )
  .post(
    "/:slug",
    async ({ user, params, body, status }) => {
      await assertSlugOwnership(user.id, params.slug);
      const link = await createSupplierBuyerLink(params.slug, body.buyerName, body.contact);
      return status(201, link);
    },
    { requireAuth: true, body: createBody },
  )
  .delete(
    "/:slug/:token",
    async ({ user, params }) => {
      await assertSlugOwnership(user.id, params.slug);
      const revoked = await revokeSupplierBuyerLink(params.slug, params.token);
      if (!revoked) throw new NotFoundError("Buyer link not found");
      return { token: params.token, revoked: true as const };
    },
    { requireAuth: true },
  );
