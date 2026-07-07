import { Elysia } from "elysia";
import {
  editLinesBodyT,
  listOrdersQueryT,
  manualOrderBodyT,
  orderT,
  ordersPageT,
  updateStatusBodyT,
} from "@/server/orders/order-schema";
import {
  createSupplierManualOrder,
  editSupplierOrderLines,
  getSupplierConfig,
  getSupplierOrder,
  listSupplierOrders,
  updateSupplierOrderStatus,
} from "@/server/portal/orders";
import { assertSlugOwnership } from "@/server/portal/ownership";
import { NotFoundError } from "../errors";
import { authPlugin } from "../plugins/auth";
import { resolveMutation } from "./order-mutation";

export const ordersRoute = new Elysia()
  .use(authPlugin)
  .get(
    "/supplier/:slug/config",
    async ({ user, params }) => {
      await assertSlugOwnership(user.id, params.slug);
      const config = await getSupplierConfig(params.slug);
      if (!config) throw new NotFoundError("Portal not found");
      return config;
    },
    { requireAuth: true },
  )
  .get(
    "/supplier/:slug/orders",
    async ({ user, params, query }) => {
      await assertSlugOwnership(user.id, params.slug);
      return listSupplierOrders(params.slug, { cursor: query.cursor, take: query.take });
    },
    { requireAuth: true, query: listOrdersQueryT, response: ordersPageT },
  )
  .get(
    "/supplier/:slug/orders/:id",
    async ({ user, params }) => {
      await assertSlugOwnership(user.id, params.slug);
      const order = await getSupplierOrder(params.slug, params.id);
      if (!order) throw new NotFoundError("Order not found");
      return order;
    },
    { requireAuth: true, response: orderT },
  )
  .post(
    "/supplier/:slug/orders",
    async ({ user, params, body, status }) => {
      await assertSlugOwnership(user.id, params.slug);
      const result = await createSupplierManualOrder(params.slug, body);
      return status(201, resolveMutation(result));
    },
    { requireAuth: true, body: manualOrderBodyT, response: { 201: orderT } },
  )
  .patch(
    "/supplier/:slug/orders/:id/status",
    async ({ user, params, body }) => {
      await assertSlugOwnership(user.id, params.slug);
      return resolveMutation(await updateSupplierOrderStatus(params.slug, params.id, body.status));
    },
    { requireAuth: true, body: updateStatusBodyT, response: orderT },
  )
  .put(
    "/supplier/:slug/orders/:id/lines",
    async ({ user, params, body }) => {
      await assertSlugOwnership(user.id, params.slug);
      return resolveMutation(await editSupplierOrderLines(params.slug, params.id, body.lines));
    },
    { requireAuth: true, body: editLinesBodyT, response: orderT },
  );
