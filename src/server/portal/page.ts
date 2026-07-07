import type { PortalConfig } from "@/portal-config";
import { env } from "@/env";
import { resolvePortalTarget } from "./resolve";
import { loadPublishedConfig } from "./store";

export interface PortalPageData {
  config: PortalConfig;
  basePath: string;
  slug: string;
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

  const config = await loadPublishedConfig(target.slug);
  if (!config) return null;

  return { config, basePath: target.basePath, slug: target.slug };
};
