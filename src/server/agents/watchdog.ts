import type { ExtractionStatus } from "./extraction";

export const DEFAULT_EXTRACTION_WALL_CLOCK_BUDGET_MS = 600_000;

export type WatchdogAction = "fail" | "ignore";

export interface WatchdogState {
  status: ExtractionStatus;
  runStartedAt: number | null;
  budgetMs: number;
}

export const decideWatchdogAction = (state: WatchdogState, now: number): WatchdogAction => {
  if (state.status !== "running") return "ignore";
  if (state.runStartedAt === null) return "ignore";
  return now - state.runStartedAt >= state.budgetMs ? "fail" : "ignore";
};
