import type { ExtractionOutcome } from "../ladder/types";

export type OutcomeStatus =
  | "ready"
  | "wrong-species"
  | "builder-mode"
  | "needs-human";

export interface SseFrame {
  event: string;
  data: unknown;
}

export const outcomeStatus = (outcome: ExtractionOutcome): OutcomeStatus => outcome.kind;

export const outcomeToFrame = (outcome: ExtractionOutcome): SseFrame => {
  switch (outcome.kind) {
    case "ready":
      return { event: "result", data: { config: outcome.config } };
    case "wrong-species":
      return {
        event: "wrong_species",
        data: { message: outcome.message, signals: outcome.signals },
      };
    case "builder-mode":
      return {
        event: "builder_mode",
        data: { message: outcome.message, preview: outcome.preview },
      };
    case "needs-human":
      return {
        event: "needs_human",
        data: { reason: outcome.reason, message: outcome.message },
      };
  }
};
