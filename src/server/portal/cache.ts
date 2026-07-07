import { env } from "@/env";

const PORTAL_SUBPATHS = ["", "/catalog", "/order"];

export const portalUrlFor = (slug: string): string => `${env.APP_URL}/portal/${slug}`;

const portalCacheUrls = (slug: string): string[] => {
  const appUrl = new URL(env.APP_URL);
  const suffix = env.PORTAL_HOST_SUFFIX;
  const urls: string[] = [];
  for (const subpath of PORTAL_SUBPATHS) {
    urls.push(`${appUrl.origin}/portal/${slug}${subpath}`);
    if (suffix) urls.push(`${appUrl.protocol}//${slug}${suffix}${subpath === "" ? "/" : subpath}`);
  }
  return urls;
};

export const purgePortalCache = async (slug: string): Promise<string[]> => {
  const urls = portalCacheUrls(slug);
  await Promise.all(urls.map((url) => caches.default.delete(url)));
  return urls;
};
