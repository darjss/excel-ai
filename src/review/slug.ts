const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "api",
  "auth",
  "portal",
  "portals",
  "login",
  "admin",
  "dashboard",
  "review",
  "pricing",
  "assets",
  "static",
]);

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export const suggestSlug = (businessName: string): string => {
  const base = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return SLUG_PATTERN.test(base) && !RESERVED_SLUGS.has(base) ? base : "";
};

export const isValidSlug = (slug: string): boolean =>
  SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
