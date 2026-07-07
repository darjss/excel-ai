import { type PortalConfig, parsePortalConfig, repairAndParse } from "@/portal-config";
import { type CompactFacts, compactWorkbook, renderPrompt } from "../compact/compact";
import { checkCaps } from "../ladder/caps";
import { classifySpecies } from "../ladder/classify";
import { renderHints } from "../ladder/hints";
import {
  BUILDER_MODE_MESSAGE,
  NEEDS_HUMAN_MESSAGE,
  WRONG_SPECIES_MESSAGE,
} from "../ladder/messages";
import { buildSheetPreview } from "../ladder/preview";
import type { BuilderHints, ExtractionOutcome, NeedsHumanReason } from "../ladder/types";
import { assessViability } from "../ladder/viability";
import { WorkbookTooLargeError } from "../parse/workbook-xml";
import { parseWorkbook } from "../parse/sheet-facts";
import { progress, type ProgressEmitter } from "../job/events";
import { applyStyle, type StyleStageDeps } from "../style";
import { type VerifyReport, verifyPortalConfig } from "../verify/draft";
import { runAgentLoop } from "./loop";
import { type ChatFn, DEFAULT_MODELS, type ModelSlots } from "./models";
import { EXTRACTION_SYSTEM_PROMPT } from "./prompt";
import { createRepairFn } from "./repair";
import { TOOL_SCHEMAS, createToolExecution } from "./tools";

export interface ExtractionDeps {
  chat: ChatFn;
  models?: ModelSlots;
  emit?: ProgressEmitter;
}

export type { ExtractionOutcome };

type WorkbookFacts = ReturnType<typeof parseWorkbook>;

type DraftResult =
  | { kind: "config"; config: PortalConfig; report: VerifyReport; iterations: number }
  | { kind: "no-draft" }
  | { kind: "invalid" };

const needsHuman = (reason: NeedsHumanReason): ExtractionOutcome => ({
  kind: "needs-human",
  reason,
  message: NEEDS_HUMAN_MESSAGE[reason],
});

const produceDraft = async (
  facts: WorkbookFacts,
  userPrompt: string,
  deps: ExtractionDeps,
  models: ModelSlots,
  emit: ProgressEmitter,
): Promise<DraftResult> => {
  const execution = createToolExecution(facts);
  const loop = await runAgentLoop({
    chat: deps.chat,
    model: models.reasoning,
    systemPrompt: EXTRACTION_SYSTEM_PROMPT,
    userPrompt,
    tools: TOOL_SCHEMAS,
    execution,
    maxCompletionTokens: 16384,
    onNarrate: (message) => emit(progress("reason", message)),
  });

  if (loop.draft === undefined) return { kind: "no-draft" };

  emit(progress("verify", "Double-checking every money calculation"));
  const firstPass = parsePortalConfig(loop.draft);
  const parsed = firstPass.ok
    ? firstPass
    : await repairAndParse(loop.draft, createRepairFn(deps.chat, models.auxiliary));
  if (!parsed.ok) return { kind: "invalid" };

  const verified = verifyPortalConfig(parsed.data, facts);
  const finalParse = parsePortalConfig(verified.config);
  if (!finalParse.ok) return { kind: "invalid" };
  return {
    kind: "config",
    config: finalParse.data,
    report: verified.report,
    iterations: loop.iterations,
  };
};

const buildUserPrompt = (
  compact: CompactFacts,
  facts: WorkbookFacts,
  hints: BuilderHints | undefined,
): string => {
  const base = renderPrompt(compact);
  if (hints === undefined) return base;
  return `${renderHints(hints, facts)}\n\n${base}`;
};

export const runExtraction = async (
  bytes: Uint8Array,
  deps: ExtractionDeps,
  hints?: BuilderHints,
): Promise<ExtractionOutcome> => {
  const models = deps.models ?? DEFAULT_MODELS;
  const emit = deps.emit ?? (() => {});

  emit(progress("parse", "Reading your workbook"));
  let facts: WorkbookFacts;
  try {
    facts = parseWorkbook(bytes);
  } catch (error) {
    return needsHuman(error instanceof WorkbookTooLargeError ? "too-large" : "unreadable");
  }

  const cap = checkCaps(facts);
  if (cap !== null) return { kind: "needs-human", reason: cap.reason, message: cap.message };

  emit(progress("compact", "Summarising the sheets and formulas"));
  const compact = compactWorkbook(facts);

  if (hints === undefined) {
    const species = await classifySpecies(facts, compact, {
      chat: deps.chat,
      model: models.auxiliary,
    });
    if (species.verdict === "not-order-sheet") {
      return { kind: "wrong-species", message: WRONG_SPECIES_MESSAGE, signals: species.signals };
    }
  }

  emit(progress("reason", "Working out your catalog and pricing rules"));
  const draft = await produceDraft(facts, buildUserPrompt(compact, facts, hints), deps, models, emit);
  if (draft.kind === "no-draft") return needsHuman("no-draft");
  if (draft.kind === "invalid") return needsHuman("internal");

  const viability = assessViability(draft.config);
  if (!viability.viable) {
    if (hints !== undefined) return needsHuman("unviable-after-hints");
    return { kind: "builder-mode", message: BUILDER_MODE_MESSAGE, preview: buildSheetPreview(facts) };
  }

  const style: StyleStageDeps = { chat: deps.chat, model: models.auxiliary, emit };
  const styled = await applyStyle(draft.config, style);
  emit(progress("validate", "Locking in the confirmed portal draft"));
  emit(progress("done", "Your portal draft is ready to review"));
  return { kind: "ready", config: styled, report: draft.report, iterations: draft.iterations };
};
