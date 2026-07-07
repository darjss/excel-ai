import { defineMiddleware } from "astro:middleware";
import { cacheRuleFor } from "@/lib/cache-config";

const sessionCookie = "better-auth.session_token";

const hasSessionCookie = (request: Request) =>
  (request.headers.get("cookie") ?? "").includes(sessionCookie);

export const edgeCache = defineMiddleware(async (context, next) => {
  const { request } = context;
  if (request.method !== "GET") return next();

  const rule = cacheRuleFor(context.url.pathname);
  const authed = hasSessionCookie(request);

  if (!rule || authed) {
    const response = await next();
    if (rule && authed) {
      response.headers.set("cache-control", "no-store");
    }
    return response;
  }

  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await next();
  const isHtml = (response.headers.get("content-type") ?? "").includes("text/html");
  if (response.ok && isHtml) {
    response.headers.set("cache-control", `public, s-maxage=${rule.sMaxAge}`);
    context.locals.cfContext.waitUntil(cache.put(request, response.clone()));
  }
  return response;
});
