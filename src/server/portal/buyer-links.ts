import { getAgentByName } from "agents";
import { env } from "cloudflare:workers";
import type { SupplierAgent } from "@/server/agents/supplier";
import type { BuyerLink, ResolvedBuyerLink } from "@/server/orders/buyer-links";
import { resolveBuyerLink } from "@/server/orders/buyer-links";

const supplierAgent = (slug: string) =>
  getAgentByName<Cloudflare.Env, SupplierAgent>(env.SUPPLIER, slug);

export const createSupplierBuyerLink = async (
  slug: string,
  buyerName: string,
  contact?: string,
): Promise<BuyerLink> => {
  const agent = await supplierAgent(slug);
  return agent.createBuyerLink(buyerName, contact);
};

export const listSupplierBuyerLinks = async (slug: string): Promise<BuyerLink[]> => {
  const agent = await supplierAgent(slug);
  return agent.listBuyerLinks();
};

export const revokeSupplierBuyerLink = async (
  slug: string,
  token: string,
): Promise<boolean> => {
  const agent = await supplierAgent(slug);
  return agent.revokeBuyerLink(token);
};

export const resolveSupplierBuyerLink = async (
  slug: string,
  token: string,
): Promise<ResolvedBuyerLink> => {
  const agent = await supplierAgent(slug);
  const links = await agent.listBuyerLinks();
  return resolveBuyerLink(links, token);
};
