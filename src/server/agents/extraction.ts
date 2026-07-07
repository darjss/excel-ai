import { Agent } from "agents";
import { env } from "cloudflare:workers";
import type { PortalConfig } from "@/portal-config";
import { runExtraction } from "@/extraction/agent/extract";
import { createChatFn, gatewayFromEnv } from "@/extraction/agent/models";
import { type ProgressEvent, progress } from "@/extraction/job/events";

export type ExtractionStatus = "idle" | "running" | "done" | "error";

export interface ExtractionState {
  status: ExtractionStatus;
  events: ProgressEvent[];
  config: PortalConfig | null;
  error: string | null;
}

const INITIAL_STATE: ExtractionState = {
  status: "idle",
  events: [],
  config: null,
  error: null,
};

export class ExtractionAgent extends Agent<Cloudflare.Env, ExtractionState> {
  initialState = INITIAL_STATE;

  async start(r2Key: string): Promise<void> {
    if (this.state.status === "running" || this.state.status === "done") return;
    this.setState({ ...INITIAL_STATE, status: "running", events: [progress("queued", "Upload received")] });
    this.ctx.waitUntil(this.run(r2Key));
  }

  private async run(r2Key: string): Promise<void> {
    const object = await env.UPLOADS.get(r2Key);
    if (object === null) {
      this.fail("Uploaded workbook was not found in storage.");
      return;
    }

    const bytes = new Uint8Array(await object.arrayBuffer());
    const chat = createChatFn(env.AI, gatewayFromEnv(env.AI_GATEWAY_ID));

    try {
      const outcome = await runExtraction(bytes, { chat, emit: (event) => this.push(event) });
      if (outcome.ok) {
        this.setState({ ...this.state, status: "done", config: outcome.config });
      } else {
        this.fail(outcome.reason);
      }
    } catch (error) {
      this.fail(error instanceof Error ? error.message : "Extraction failed unexpectedly.");
    }
  }

  snapshot(): ExtractionState {
    return this.state;
  }

  private push(event: ProgressEvent): void {
    this.setState({ ...this.state, events: [...this.state.events, event] });
  }

  private fail(message: string): void {
    this.setState({
      ...this.state,
      status: "error",
      error: message,
      events: [...this.state.events, progress("error", message)],
    });
  }
}
