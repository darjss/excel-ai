import type { APIRoute } from "astro";
import { env } from "@/env";

export const GET: APIRoute = () => {
  const base = env.APP_URL.replace(/\/$/, "");
  const body = `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, s-maxage=3600",
    },
  });
};
