/**
 * Anonymous extraction funnel. POST /api/extraction accepts a spreadsheet upload
 * from an unauthenticated visitor, so it carries the guards that keep the funnel
 * from being abused before auth exists:
 *  - a 10MB multipart body cap enforced before the body is buffered (413), and
 *  - an IP-keyed token-bucket rate limit of N runs/hour (429, env-configured via
 *    EXTRACTION_RATE_LIMIT_PER_HOUR, default 5).
 * These are the anonymous-funnel guard only; per-user quotas and ownership land
 * with auth integration (issue #9).
 */
import { createId } from "@paralleldrive/cuid2";
import { getAgentByName } from "agents";
import { env } from "cloudflare:workers";
import { Elysia, t } from "elysia";
import type { ExtractionAgent, ExtractionState } from "@/server/agents/extraction";
import { AppError } from "../errors";
import { consumeExtractionToken } from "../rate-limit";

const SSE_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache",
  connection: "keep-alive",
};

const SSE_DEADLINE_MS = 300_000;
const SSE_POLL_MS = 400;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const getAgent = (id: string) => getAgentByName<Cloudflare.Env, ExtractionAgent>(env.EXTRACTION, id);

const sseFrame = (event: string, data: unknown): string =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const clientIp = (request: Request): string =>
  request.headers.get("CF-Connecting-IP") ?? "unknown";

export const extractionRoute = new Elysia({ prefix: "/extraction" })
  .post(
    "/",
    async ({ request, status }) => {
      const declaredLength = Number(request.headers.get("content-length") ?? "");
      if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES) {
        throw new AppError("payload_too_large", "Upload exceeds the 10MB limit.");
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

      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) {
        throw new AppError("validation", "Expected a non-empty .xlsx file in the 'file' field.");
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new AppError("payload_too_large", "Upload exceeds the 10MB limit.");
      }

      const jobId = createId();
      const key = `uploads/${jobId}/${file.name}`;
      await env.UPLOADS.put(key, await file.arrayBuffer());
      const agent = await getAgent(jobId);
      await agent.start(key);
      return status(202, { jobId });
    },
    {
      response: { 202: t.Object({ jobId: t.String() }) },
    },
  )
  .get("/:id/events", async ({ params }) => {
    const agent = await getAgent(params.id);
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown): void =>
          controller.enqueue(encoder.encode(sseFrame(event, data)));

        const initial: ExtractionState = await agent.snapshot();
        if (initial.status === "idle") {
          send("not_found", { message: "No extraction job exists for this id." });
          controller.close();
          return;
        }

        let sent = 0;
        const deadline = Date.now() + SSE_DEADLINE_MS;
        while (Date.now() < deadline) {
          const snapshot: ExtractionState = await agent.snapshot();
          for (; sent < snapshot.events.length; sent += 1) send("progress", snapshot.events[sent]);
          if (snapshot.status === "done") {
            send("result", { config: snapshot.config });
            break;
          }
          if (snapshot.status === "error") {
            send("failed", { message: snapshot.error });
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, SSE_POLL_MS));
        }
        controller.close();
      },
    });
    return new Response(stream, { headers: SSE_HEADERS });
  });
