export type ExtractionPhase =
  | "queued"
  | "parse"
  | "compact"
  | "reason"
  | "verify"
  | "validate"
  | "done"
  | "error";

export interface ProgressEvent {
  phase: ExtractionPhase;
  message: string;
  percent: number;
}

export type ProgressEmitter = (event: ProgressEvent) => void;

const PHASE_PERCENT: Record<ExtractionPhase, number> = {
  queued: 2,
  parse: 15,
  compact: 30,
  reason: 55,
  verify: 80,
  validate: 92,
  done: 100,
  error: 100,
};

export const progress = (phase: ExtractionPhase, message: string): ProgressEvent => ({
  phase,
  message,
  percent: PHASE_PERCENT[phase],
});
