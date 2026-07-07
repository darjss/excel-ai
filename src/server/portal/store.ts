import { getAgentByName } from "agents";
import { env } from "cloudflare:workers";
import type { PlanSlug } from "@/lib/plans";
import type { PortalConfig } from "@/portal-config";
import type {
  PublishedPortal,
  SetPortalConfigResult,
  SupplierAgent,
} from "@/server/agents/supplier";

const supplierAgent = (slug: string) =>
  getAgentByName<Cloudflare.Env, SupplierAgent>(env.SUPPLIER, slug);

export const loadPublishedConfig = async (slug: string): Promise<PortalConfig | null> => {
  const agent = await supplierAgent(slug);
  return agent.getPortalConfig();
};

export const loadPublishedPortal = async (slug: string): Promise<PublishedPortal | null> => {
  const agent = await supplierAgent(slug);
  return agent.getPublished();
};

export const publishPortalConfig = async (
  slug: string,
  config: PortalConfig,
  tier: PlanSlug = "standard",
): Promise<SetPortalConfigResult> => {
  const agent = await supplierAgent(slug);
  const result = await agent.setPortalConfig(config);
  if (!result.ok) return result;
  await agent.publish(tier);
  return { ok: true };
};
