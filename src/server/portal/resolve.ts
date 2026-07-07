export interface PortalTarget {
  slug: string;
  basePath: string;
}

export const slugFromHost = (host: string | null, suffix: string | undefined): string | null => {
  if (!host || !suffix) return null;
  if (!host.endsWith(suffix)) return null;
  const subdomain = host.slice(0, host.length - suffix.length);
  if (subdomain.length === 0 || subdomain.includes(".")) return null;
  return subdomain;
};

export const slugFromPath = (pathname: string): string | null => {
  const slug = /^\/portal\/([^/]+)/.exec(pathname)?.[1];
  return slug ? decodeURIComponent(slug) : null;
};

export const resolvePortalTarget = (
  host: string | null,
  pathname: string,
  suffix: string | undefined,
): PortalTarget | null => {
  const hostSlug = slugFromHost(host, suffix);
  if (hostSlug) return { slug: hostSlug, basePath: "" };

  const pathSlug = slugFromPath(pathname);
  if (pathSlug) return { slug: pathSlug, basePath: `/portal/${pathSlug}` };

  return null;
};
