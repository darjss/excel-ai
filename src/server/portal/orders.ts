import { getAgentByName } from "agents";
import { env } from "cloudflare:workers";
import type { SupplierAgent } from "@/server/agents/supplier";
import type { SubmitOrderInput, SubmitOrderResult } from "@/server/orders/order";

const supplierAgent = (slug: string) =>
  getAgentByName<Cloudflare.Env, SupplierAgent>(env.SUPPLIER, slug);

export const submitPortalOrder = async (
  slug: string,
  input: SubmitOrderInput,
): Promise<SubmitOrderResult> => {
  const agent = await supplierAgent(slug);
  return agent.submitOrder(input);
};
