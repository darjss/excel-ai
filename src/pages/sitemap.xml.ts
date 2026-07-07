import type { APIRoute } from "astro";
import { env } from "@/env";
import { templatePath } from "@/marketing/seo";
import { templates } from "@/marketing/templates";

const staticPaths = ["/", "/pricing", "/templates"];

export const GET: APIRoute = () => {
  const base = env.APP_URL.replace(/\/$/, "");
  const paths = [...staticPaths, ...templates.map((template) => templatePath(template))];
  const urls = paths.map((path) => `  <url><loc>${base}${path}</loc></url>`).join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600",
    },
  });
};
