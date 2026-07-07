import { sequence } from "astro:middleware";
import { edgeCache } from "./edge-cache";
import { portalHost } from "./portal-host";
import { sessionGuard } from "./session-guard";

export const onRequest = sequence(portalHost, edgeCache, sessionGuard);
