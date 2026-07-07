import { defineMiddleware } from "astro:middleware";
import { env } from "@/env";
import { slugFromHost } from "@/server/portal/resolve";

export const portalHost = defineMiddleware((context, next) => {
  const slug = slugFromHost(context.request.headers.get("host"), env.PORTAL_HOST_SUFFIX);
  if (!slug) return next();
  if (context.url.pathname.startsWith("/portal/")) return next();

  const rewritten = new URL(context.url);
  const suffix = context.url.pathname === "/" ? "" : context.url.pathname;
  rewritten.pathname = `/portal/${slug}${suffix}`;
  return next(rewritten);
});
