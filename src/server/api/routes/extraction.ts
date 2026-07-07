import { createId } from "@paralleldrive/cuid2";
import { getAgentByName } from "agents";
import { env } from "cloudflare:workers";
import { Elysia, t } from "elysia";
import type { ExtractionAgent, ExtractionState } from "@/server/agents/extraction";
import { AppError } from "../errors";

const SSE_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache",
  connection: "keep-alive",
};

const SSE_DEADLINE_MS = 120_000;
const SSE_POLL_MS = 400;

const getAgent = (id: string) => getAgentByName<Cloudflare.Env, ExtractionAgent>(env.EXTRACTION, id);

const sseFrame = (event: string, data: unknown): string =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

export const extractionRoute = new Elysia({ prefix: "/extraction" })
  .post(
    "/",
    async ({ request, status }) => {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) {
        throw new AppError("validation", "Expected a non-empty .xlsx file in the 'file' field.");
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
