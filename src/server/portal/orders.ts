import { getAgentByName } from "agents";
import { env } from "cloudflare:workers";
import type { SupplierAgent } from "@/server/agents/supplier";
import type { Order, SubmitOrderInput, SubmitOrderResult } from "@/server/orders/order";

const supplierAgent = (slug: string) =>
  getAgentByName<Cloudflare.Env, SupplierAgent>(env.SUPPLIER, slug);

export const submitPortalOrder = async (
  slug: string,
  input: SubmitOrderInput,
): Promise<SubmitOrderResult> => {
  const agent = await supplierAgent(slug);
  return agent.submitOrder(input);
};

export const listPortalOrders = async (slug: string): Promise<Order[]> => {
  const agent = await supplierAgent(slug);
  return agent.listOrders();
};

export const getPortalOrder = async (slug: string, id: string): Promise<Order | null> => {
  const agent = await supplierAgent(slug);
  return agent.getOrder(id);
};
