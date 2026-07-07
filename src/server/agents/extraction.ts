import { Agent } from "agents";
import { env } from "cloudflare:workers";
import { runExtraction } from "@/extraction/agent/extract";
import { createChatFn, gatewayFromEnv } from "@/extraction/agent/models";
import { type ProgressEvent, progress } from "@/extraction/job/events";
import type { BuilderHints, ExtractionOutcome } from "@/extraction/ladder/types";

export type ExtractionStatus =
  | "idle"
  | "running"
  | "ready"
  | "wrong-species"
  | "builder-mode"
  | "needs-human";

export interface ExtractionState {
  status: ExtractionStatus;
  events: ProgressEvent[];
  outcome: ExtractionOutcome | null;
  r2Key: string | null;
}

const INITIAL_STATE: ExtractionState = {
  status: "idle",
  events: [],
  outcome: null,
  r2Key: null,
};

const TERMINAL: ReadonlySet<ExtractionStatus> = new Set([
  "ready",
  "wrong-species",
  "needs-human",
]);

export class ExtractionAgent extends Agent<Cloudflare.Env, ExtractionState> {
  initialState = INITIAL_STATE;

  async start(r2Key: string): Promise<void> {
    if (this.state.status === "running") return;
    if (TERMINAL.has(this.state.status)) return;
    this.setState({
      ...INITIAL_STATE,
      status: "running",
      r2Key,
      events: [progress("queued", "Upload received")],
    });
    this.ctx.waitUntil(this.run(r2Key));
  }

  async refine(hints: BuilderHints): Promise<void> {
    if (this.state.status !== "builder-mode") return;
    const r2Key = this.state.r2Key;
    if (r2Key === null) return;
    this.setState({
      ...this.state,
      status: "running",
      outcome: null,
      events: [progress("queued", "Rebuilding with your guidance")],
    });
    this.ctx.waitUntil(this.run(r2Key, hints));
  }

  snapshot(): ExtractionState {
    return this.state;
  }

  private async run(r2Key: string, hints?: BuilderHints): Promise<void> {
    try {
      const object = await env.UPLOADS.get(r2Key);
      if (object === null) {
        this.apply({ kind: "needs-human", reason: "internal", message: NOT_FOUND_MESSAGE });
        return;
      }
      const bytes = new Uint8Array(await object.arrayBuffer());
      const chat = createChatFn(env.AI, gatewayFromEnv(env.AI_GATEWAY_ID));
      const outcome = await runExtraction(bytes, { chat, emit: (event) => this.push(event) }, hints);
      this.apply(outcome);
    } catch {
      this.apply({ kind: "needs-human", reason: "internal", message: INTERNAL_MESSAGE });
    }
  }

  private apply(outcome: ExtractionOutcome): void {
    this.setState({ ...this.state, status: outcome.kind, outcome });
  }

  private push(event: ProgressEvent): void {
    this.setState({ ...this.state, events: [...this.state.events, event] });
  }
}

const NOT_FOUND_MESSAGE =
  "We lost track of your uploaded workbook. Send it to us and we'll take a look.";
const INTERNAL_MESSAGE =
  "Something went wrong on our side while reading this workbook. Send it to us and we'll take a look.";
