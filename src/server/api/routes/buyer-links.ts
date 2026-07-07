import { Elysia, t } from "elysia";
import {
  createSupplierBuyerLink,
  listSupplierBuyerLinks,
  revokeSupplierBuyerLink,
} from "@/server/portal/buyer-links";
import { NotFoundError } from "../errors";
import { authPlugin } from "../plugins/auth";

const createBody = t.Object({
  buyerName: t.String({ minLength: 1, maxLength: 200 }),
  contact: t.Optional(t.String({ maxLength: 200 })),
});

// TODO(#24): assert the session user owns `slug` via the portal_draft/slug association once PR #24 merges.
const assertSlugOwnership = (_userId: string, _slug: string): void => {};

export const buyerLinksRoute = new Elysia({ prefix: "/buyer-links" })
  .use(authPlugin)
  .get(
    "/:slug",
    ({ user, params }) => {
      assertSlugOwnership(user.id, params.slug);
      return listSupplierBuyerLinks(params.slug);
    },
    { requireAuth: true },
  )
  .post(
    "/:slug",
    async ({ user, params, body, status }) => {
      assertSlugOwnership(user.id, params.slug);
      const link = await createSupplierBuyerLink(params.slug, body.buyerName, body.contact);
      return status(201, link);
    },
    { requireAuth: true, body: createBody },
  )
  .delete(
    "/:slug/:token",
    async ({ user, params }) => {
      assertSlugOwnership(user.id, params.slug);
      const revoked = await revokeSupplierBuyerLink(params.slug, params.token);
      if (!revoked) throw new NotFoundError("Buyer link not found");
      return { token: params.token, revoked: true as const };
    },
    { requireAuth: true },
  );
