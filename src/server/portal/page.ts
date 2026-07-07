import { env } from "@/env";
import { entitlementsFor } from "@/lib/plans";
import type { PortalConfig } from "@/portal-config";
import { resolvePortalTarget } from "./resolve";
import { loadPublishedPortal } from "./store";

export interface PortalPageData {
  config: PortalConfig;
  basePath: string;
  slug: string;
  badgeHidden: boolean;
}

export const loadPortalPage = async (
  request: Request,
  url: URL,
): Promise<PortalPageData | null> => {
  const target = resolvePortalTarget(
    request.headers.get("host"),
    url.pathname,
    env.PORTAL_HOST_SUFFIX,
  );
  if (!target) return null;

  const published = await loadPublishedPortal(target.slug);
  if (!published) return null;

  return {
    config: published.config,
    basePath: target.basePath,
    slug: target.slug,
    badgeHidden: entitlementsFor(published.tier).badgeRemoved,
  };
};
