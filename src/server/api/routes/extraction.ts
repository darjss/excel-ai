/**
 * Anonymous extraction funnel. POST /api/extraction accepts a spreadsheet upload
 * from an unauthenticated visitor, so it carries the guards that keep the funnel
 * from being abused before auth exists:
 *  - a 10MB multipart body cap enforced before the body is buffered (413), and
 *  - an IP-keyed token-bucket rate limit of N runs/hour (429, env-configured via
 *    EXTRACTION_RATE_LIMIT_PER_HOUR, default 5).
 * These are the anonymous-funnel guard only; per-user quotas and ownership land
 * with auth integration (issue #9).
 *
 * The funnel never dead-ends: every run resolves to one of four outcomes
 * (ready | wrong-species | builder-mode | needs-human), each surfaced as its own
 * SSE event. Builder mode can re-run once with supplier hints (POST /:id/refine);
 * needs-human collects an email for the white-glove pipeline (POST /white-glove).
 */
import { createId } from "@paralleldrive/cuid2";
import { getAgentByName } from "agents";
import { env } from "cloudflare:workers";
import { Elysia, t } from "elysia";
import { outcomeToFrame } from "@/extraction/job/outcome";
import type { ExtractionAgent, ExtractionState } from "@/server/agents/extraction";
import { db } from "@/server/db";
import { whiteGloveRequest } from "@/server/db/schema";
import { submitWhiteGlove, type WhiteGloveStore } from "@/server/extraction/white-glove";
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

const TERMINAL: ReadonlySet<ExtractionState["status"]> = new Set([
  "ready",
  "wrong-species",
  "builder-mode",
  "needs-human",
]);

const getAgent = (id: string) => getAgentByName<Cloudflare.Env, ExtractionAgent>(env.EXTRACTION, id);

const sseFrame = (event: string, data: unknown): string =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const clientIp = (request: Request): string =>
  request.headers.get("CF-Connecting-IP") ?? "unknown";

const hintsSchema = t.Object({
  sheet: t.String({ minLength: 1 }),
  range: t.String({ minLength: 1 }),
  columns: t.Object({
    product: t.Optional(t.String()),
    price: t.Optional(t.String()),
    unit: t.Optional(t.String()),
    category: t.Optional(t.String()),
  }),
});

const store: WhiteGloveStore = {
  insert: async (row) => {
    await db.insert(whiteGloveRequest).values(row);
  },
};

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
  .post(
    "/:id/refine",
    async ({ params, body, status }) => {
      const agent = await getAgent(params.id);
      const snapshot: ExtractionState = await agent.snapshot();
      if (snapshot.status !== "builder-mode") {
        throw new AppError("conflict", "This job is not waiting for builder-mode guidance.");
      }
      await agent.refine(body);
      return status(202, { jobId: params.id });
    },
    {
      body: hintsSchema,
      response: { 202: t.Object({ jobId: t.String() }) },
    },
  )
  .post(
    "/white-glove",
    async ({ request, body, status }) => {
      const result = await submitWhiteGlove(
        {
          store,
          cache: env.CACHE,
          ip: clientIp(request),
          limitVar: env.WHITE_GLOVE_RATE_LIMIT_PER_HOUR,
        },
        body,
      );
      if (!result.ok) {
        throw new AppError(result.code, result.message, result.details);
      }
      return status(201, { ok: true });
    },
    {
      response: { 201: t.Object({ ok: t.Boolean() }) },
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
          if (TERMINAL.has(snapshot.status) && snapshot.outcome !== null) {
            const frame = outcomeToFrame(snapshot.outcome);
            send(frame.event, frame.data);
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, SSE_POLL_MS));
        }
        controller.close();
      },
    });
    return new Response(stream, { headers: SSE_HEADERS });
  });
