import { Agent } from "agents";
import { env } from "cloudflare:workers";
import type { PortalConfig } from "@/portal-config";
import { runExtraction } from "@/extraction/agent/extract";
import {
  createChatFn,
  DEFAULT_MODEL_CALL_TIMEOUT_MS,
  gatewayFromEnv,
  withTimeout,
} from "@/extraction/agent/models";
import { type ProgressEvent, progress } from "@/extraction/job/events";
import type { BuilderHints, ExtractionOutcome } from "@/extraction/ladder/types";
import { applyReviewAction, hasFinding, type ReviewAction } from "@/review/mutations";
import {
  DEFAULT_EXTRACTION_WALL_CLOCK_BUDGET_MS,
  decideWatchdogAction,
} from "./watchdog";

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
  runStartedAt: number | null;
  watchdogId: string | null;
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
  runStartedAt: null,
  watchdogId: null,
};

const TERMINAL: ReadonlySet<ExtractionStatus> = new Set([
  "ready",
  "wrong-species",
  "needs-human",
]);

export class ExtractionAgent extends Agent<Cloudflare.Env, ExtractionState> {
  initialState = INITIAL_STATE;
  private abortController: AbortController | null = null;

  async start(r2Key: string): Promise<void> {
    if (this.state.status === "running") return;
    if (TERMINAL.has(this.state.status)) return;
    const watchdog = await this.armWatchdog();
    this.setState({
      ...INITIAL_STATE,
      status: "running",
      r2Key,
      events: [progress("queued", "Upload received")],
      runStartedAt: watchdog.startedAt,
      watchdogId: watchdog.id,
    });
    this.ctx.waitUntil(this.run(r2Key));
  }

  async refine(hints: BuilderHints): Promise<void> {
    if (this.state.status !== "builder-mode") return;
    const r2Key = this.state.r2Key;
    if (r2Key === null) return;
    const watchdog = await this.armWatchdog();
    this.setState({
      ...this.state,
      status: "running",
      outcome: null,
      events: [progress("queued", "Rebuilding with your guidance")],
      runStartedAt: watchdog.startedAt,
      watchdogId: watchdog.id,
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

  async onWatchdogAlarm(): Promise<void> {
    const action = decideWatchdogAction(
      {
        status: this.state.status,
        runStartedAt: this.state.runStartedAt,
        budgetMs: wallClockBudgetMs(),
      },
      Date.now(),
    );
    if (action === "ignore") return;
    this.abortController?.abort();
    this.apply({ kind: "needs-human", reason: "internal", message: WATCHDOG_MESSAGE });
  }

  private async run(r2Key: string, hints?: BuilderHints): Promise<void> {
    const controller = new AbortController();
    this.abortController = controller;
    try {
      const object = await env.UPLOADS.get(r2Key);
      if (object === null) {
        if (this.state.status !== "running") return;
        this.apply({ kind: "needs-human", reason: "internal", message: NOT_FOUND_MESSAGE });
        return;
      }
      const bytes = new Uint8Array(await object.arrayBuffer());
      const chat = withTimeout(
        createChatFn(env.AI, gatewayFromEnv(env.AI_GATEWAY_ID)),
        modelCallTimeoutMs(),
        controller.signal,
      );
      const outcome = await runExtraction(
        bytes,
        { chat, emit: (event) => this.push(event), signal: controller.signal },
        hints,
      );
      if (outcome.kind === "aborted") return;
      if (this.state.status !== "running") return;
      this.apply(outcome);
    } catch {
      if (this.state.status !== "running") return;
      this.apply({ kind: "needs-human", reason: "internal", message: INTERNAL_MESSAGE });
    } finally {
      this.abortController = null;
      await this.clearWatchdog();
    }
  }

  private async armWatchdog(): Promise<{ id: string; startedAt: number }> {
    const existing = this.state.watchdogId;
    if (existing !== null) await this.cancelSchedule(existing);
    const startedAt = Date.now();
    const budgetSeconds = Math.max(1, Math.ceil(wallClockBudgetMs() / 1000));
    const schedule = await this.schedule(budgetSeconds, "onWatchdogAlarm");
    return { id: schedule.id, startedAt };
  }

  private async clearWatchdog(): Promise<void> {
    const id = this.state.watchdogId;
    if (id !== null) await this.cancelSchedule(id);
    this.setState({ ...this.state, watchdogId: null, runStartedAt: null });
  }

  private apply(outcome: ExtractionOutcome): void {
    if (TERMINAL.has(this.state.status)) return;
    this.setState({ ...this.state, status: outcome.kind, outcome });
  }

  private push(event: ProgressEvent): void {
    this.setState({ ...this.state, events: [...this.state.events, event] });
  }
}

const readPositiveMs = (raw: unknown, fallback: number): number => {
  const value = typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const modelCallTimeoutMs = (): number =>
  readPositiveMs(env.MODEL_CALL_TIMEOUT_MS, DEFAULT_MODEL_CALL_TIMEOUT_MS);

const wallClockBudgetMs = (): number =>
  readPositiveMs(env.EXTRACTION_WALL_CLOCK_BUDGET_MS, DEFAULT_EXTRACTION_WALL_CLOCK_BUDGET_MS);

const NOT_FOUND_MESSAGE =
  "We lost track of your uploaded workbook. Send it to us and we'll take a look.";
const INTERNAL_MESSAGE =
  "Something went wrong on our side while reading this workbook. Send it to us and we'll take a look.";
const WATCHDOG_MESSAGE =
  "This is taking far longer than it should on our side, so we've stopped it. Send it to us and we'll take a look.";
