import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

const BASE_URL = process.env.EXTRACTION_LIVE_URL ?? "http://localhost:8787";

interface ProgressLine {
  phase: string;
  message: string;
  percent: number;
}

const fixture = process.argv[2];
if (fixture === undefined) {
  console.error("usage: pnpm extraction:live <fixture.xlsx>");
  console.error("Requires a running worker with a remote AI binding, e.g. `wrangler dev --remote`.");
  process.exit(1);
}

const path = fixture.includes("/") ? fixture : join("fixtures", "excel-samples", fixture);
const bytes = readFileSync(path);

const upload = async (): Promise<string> => {
  const form = new FormData();
  form.set("file", new Blob([bytes]), basename(path));
  const response = await fetch(`${BASE_URL}/api/extraction`, { method: "POST", body: form });
  if (!response.ok) throw new Error(`upload failed: ${response.status} ${await response.text()}`);
  const body = (await response.json()) as { jobId: string };
  console.log(`job started: ${body.jobId}`);
  return body.jobId;
};

const streamEvents = async (jobId: string): Promise<void> => {
  const response = await fetch(`${BASE_URL}/api/extraction/${jobId}/events`);
  if (response.body === null) throw new Error("no event stream");
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const eventType = /event: (.*)/.exec(frame)?.[1] ?? "message";
      const dataLine = /data: (.*)/.exec(frame)?.[1];
      if (dataLine === undefined) continue;
      const data: unknown = JSON.parse(dataLine);
      if (eventType === "progress") {
        const line = data as ProgressLine;
        console.log(`  [${String(line.percent).padStart(3)}%] ${line.phase.padEnd(8)} ${line.message}`);
      } else if (eventType === "result") {
        const { config } = data as { config: Record<string, unknown> };
        console.log("\nPortalConfig produced:");
        console.log(JSON.stringify(config, null, 2));
        return;
      } else if (eventType === "failed") {
        console.error(`\nExtraction error: ${JSON.stringify(data)}`);
        process.exit(1);
      }
    }
  }
};

const jobId = await upload();
await streamEvents(jobId);
