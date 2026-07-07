import { compactWorkbook, renderPromptWithBudget } from "../compact/compact";
import type { WorkbookFacts } from "../types";
import { NEEDS_HUMAN_MESSAGE } from "./messages";
import type { NeedsHumanReason } from "./types";

const MAX_SHEETS = 12;

export interface CapVerdict {
  reason: NeedsHumanReason;
  message: string;
}

const verdict = (reason: NeedsHumanReason): CapVerdict => ({
  reason,
  message: NEEDS_HUMAN_MESSAGE[reason],
});

export const checkCaps = (facts: WorkbookFacts): CapVerdict | null => {
  if (facts.hasVba) return verdict("macro-workbook");
  if (facts.sheetNames.length > MAX_SHEETS) return verdict("too-many-sheets");
  if (renderPromptWithBudget(compactWorkbook(facts)).truncated) return verdict("too-large");
  return null;
};
