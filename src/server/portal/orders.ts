import { getAgentByName } from "agents";
import { env } from "cloudflare:workers";
import type { PortalConfig } from "@/portal-config";
import type { OrderMutationResult, SupplierAgent } from "@/server/agents/supplier";
import type { EditLineInput, ManualOrderInput } from "@/server/orders/edit";
import type { Order, OrderStatus, SubmitOrderInput, SubmitOrderResult } from "@/server/orders/order";
import type { OrdersPage, OrdersPageParams } from "@/server/orders/pagination";

const supplierAgent = (slug: string) =>
  getAgentByName<Cloudflare.Env, SupplierAgent>(env.SUPPLIER, slug);

export const submitPortalOrder = async (
  slug: string,
  input: SubmitOrderInput,
): Promise<SubmitOrderResult> => {
  const agent = await supplierAgent(slug);
  return agent.submitOrder(input);
};

export const getSupplierConfig = async (slug: string): Promise<PortalConfig | null> => {
  const agent = await supplierAgent(slug);
  return agent.getPortalConfig();
};

export const listSupplierOrders = async (
  slug: string,
  params: OrdersPageParams,
): Promise<OrdersPage> => {
  const agent = await supplierAgent(slug);
  return agent.listOrdersPage(params);
};

export const getSupplierOrder = async (slug: string, id: string): Promise<Order | null> => {
  const agent = await supplierAgent(slug);
  return agent.getOrder(id);
};

export const updateSupplierOrderStatus = async (
  slug: string,
  id: string,
  status: OrderStatus,
): Promise<OrderMutationResult> => {
  const agent = await supplierAgent(slug);
  return agent.updateOrderStatus(id, status);
};

export const editSupplierOrderLines = async (
  slug: string,
  id: string,
  lines: readonly EditLineInput[],
): Promise<OrderMutationResult> => {
  const agent = await supplierAgent(slug);
  return agent.editOrderLines(id, lines);
};

export const createSupplierManualOrder = async (
  slug: string,
  input: ManualOrderInput,
): Promise<OrderMutationResult> => {
  const agent = await supplierAgent(slug);
  return agent.createManualOrder(input);
};
