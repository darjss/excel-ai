import { Agent } from "agents";
import { env } from "cloudflare:workers";
import type { PortalConfig } from "@/portal-config";
import { runExtraction } from "@/extraction/agent/extract";
import { createChatFn, gatewayFromEnv } from "@/extraction/agent/models";
import { type ProgressEvent, progress } from "@/extraction/job/events";
import type { BuilderHints, ExtractionOutcome } from "@/extraction/ladder/types";
import { applyReviewAction, hasFinding, type ReviewAction } from "@/review/mutations";

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
  published: boolean;
  slug: string | null;
  answeredFindingIds: string[];
}

export type ReviewResult =
  | { ok: true; config: PortalConfig }
  | { ok: false; reason: "not_ready" | "unknown_finding" };

const INITIAL_STATE: ExtractionState = {
  status: "idle",
  events: [],
  outcome: null,
  r2Key: null,
  published: false,
  slug: null,
  answeredFindingIds: [],
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

  seed(config: PortalConfig): void {
    this.setState({
      ...INITIAL_STATE,
      status: "ready",
      outcome: { kind: "ready", config, report: { anomalies: [], downgrades: [] }, iterations: 0 },
      events: [progress("done", "Seeded draft ready to review")],
    });
  }

  applyReview(action: ReviewAction): ReviewResult {
    const outcome = this.state.outcome;
    if (outcome?.kind !== "ready") {
      return { ok: false, reason: "not_ready" };
    }
    if (action.type === "finding-decision" && !hasFinding(outcome.config, action.findingId)) {
      return { ok: false, reason: "unknown_finding" };
    }
    const config = applyReviewAction(outcome.config, action);
    const answeredFindingIds =
      action.type === "finding-decision"
        ? [...new Set([...this.state.answeredFindingIds, action.findingId])]
        : this.state.answeredFindingIds;
    this.setState({
      ...this.state,
      outcome: { ...outcome, config },
      published: false,
      answeredFindingIds,
    });
    return { ok: true, config };
  }

  markPublished(slug: string): void {
    if (this.state.outcome?.kind !== "ready") return;
    this.setState({ ...this.state, published: true, slug });
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
