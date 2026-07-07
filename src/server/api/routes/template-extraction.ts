import { createId } from "@paralleldrive/cuid2";
import { getAgentByName } from "agents";
import { env } from "cloudflare:workers";
import { Elysia, t } from "elysia";
import { templateSlugs } from "@/marketing/templates";
import type { ExtractionAgent } from "@/server/agents/extraction";
import { AppError } from "../errors";
import { consumeExtractionToken } from "../rate-limit";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const getAgent = (id: string) =>
  getAgentByName<Cloudflare.Env, ExtractionAgent>(env.EXTRACTION, id);

const clientIp = (request: Request): string => request.headers.get("CF-Connecting-IP") ?? "unknown";

export const templateExtractionRoute = new Elysia({ prefix: "/extraction" }).post(
  "/from-template",
  async ({ body, request, status }) => {
    if (!templateSlugs().includes(body.slug)) {
      throw new AppError("not_found", "Unknown template.");
    }

    const decision = await consumeExtractionToken(
      env.CACHE,
      clientIp(request),
      env.EXTRACTION_RATE_LIMIT_PER_HOUR,
    );
    if (!decision.allowed) {
      throw new AppError(
        "rate_limited",
        `Too many extraction runs. Try again later (limit ${decision.limit}/hour).`,
      );
    }

    const assetUrl = new URL(`/templates/${body.slug}.xlsx`, request.url);
    const asset = await fetch(assetUrl);
    if (!asset.ok) {
      throw new AppError("internal", "Template file could not be loaded.");
    }

    const buffer = await asset.arrayBuffer();
    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      throw new AppError("payload_too_large", "Template file exceeds the 10MB limit.");
    }

    const jobId = createId();
    const key = `uploads/${jobId}/${body.slug}.xlsx`;
    await env.UPLOADS.put(key, buffer);
    const agent = await getAgent(jobId);
    await agent.start(key);
    return status(202, { jobId });
  },
  {
    body: t.Object({ slug: t.String() }),
    response: { 202: t.Object({ jobId: t.String() }) },
  },
);
