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
  "mail",
  "root",
  "staging",
  "cdn",
  "blog",
  "help",
  "support",
  "status",
  "docs",
  "ns1",
  "ns2",
  "mx",
  "smtp",
  "imap",
  "pop",
  "ftp",
  "dev",
  "test",
  "demo",
]);

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export const suggestSlug = (businessName: string): string => {
  const base = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return isValidSlug(base) ? base : "";
};

export const isValidSlug = (slug: string): boolean => {
  if (!SLUG_PATTERN.test(slug)) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  if (slug.startsWith("xn--")) return false;
  if (slug.includes("--")) return false;
  return true;
};
