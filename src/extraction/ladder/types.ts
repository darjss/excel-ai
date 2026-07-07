import type { PortalConfig } from "@/portal-config";
import type { VerifyReport } from "../verify/draft";

export type NeedsHumanReason =
  | "too-large"
  | "too-many-sheets"
  | "macro-workbook"
  | "unreadable"
  | "no-draft"
  | "unviable-after-hints"
  | "internal";

export type SpeciesVerdictKind = "order-sheet" | "not-order-sheet" | "ambiguous";

export interface SpeciesSignals {
  numericColumns: number;
  priceHeaderHits: number;
  formulaCount: number;
  validationCount: number;
  textCells: number;
}

export interface SpeciesVerdict {
  verdict: SpeciesVerdictKind;
  method: "deterministic" | "model" | "fallback";
  signals: SpeciesSignals;
}

export interface SheetPreview {
  sheet: string;
  dimension: string | null;
  columns: string[];
  rows: string[][];
}

export interface BuilderColumns {
  product?: string;
  price?: string;
  unit?: string;
  category?: string;
}

export interface BuilderHints {
  sheet: string;
  range: string;
  columns: BuilderColumns;
}

export type ExtractionOutcome =
  | { kind: "ready"; config: PortalConfig; report: VerifyReport; iterations: number }
  | { kind: "wrong-species"; message: string; signals: SpeciesSignals }
  | { kind: "builder-mode"; message: string; preview: SheetPreview[] }
  | { kind: "needs-human"; reason: NeedsHumanReason; message: string };
