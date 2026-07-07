import { type PortalConfig, parsePortalConfig, repairAndParse } from "@/portal-config";
import { compactWorkbook, renderPrompt } from "../compact/compact";
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

export type ExtractionOutcome =
  | { ok: true; config: PortalConfig; report: VerifyReport; iterations: number }
  | { ok: false; reason: string; details?: readonly { path: string; message: string }[] };

export const runExtraction = async (
  bytes: Uint8Array,
  deps: ExtractionDeps,
): Promise<ExtractionOutcome> => {
  const models = deps.models ?? DEFAULT_MODELS;
  const emit = deps.emit ?? (() => {});

  emit(progress("parse", "Reading your workbook"));
  const facts = parseWorkbook(bytes);

  emit(progress("compact", "Summarising the sheets and formulas"));
  const compact = compactWorkbook(facts);
  const userPrompt = renderPrompt(compact);

  emit(progress("reason", "Working out your catalog and pricing rules"));
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

  if (loop.draft === undefined) {
    return { ok: false, reason: "The model finished without proposing a draft." };
  }

  const style: StyleStageDeps = { chat: deps.chat, model: models.auxiliary, emit };

  emit(progress("verify", "Double-checking every money calculation"));
  const firstPass = parsePortalConfig(loop.draft);
  if (firstPass.ok) return finalize(firstPass.data, facts, emit, loop.iterations, style);

  const repaired = await repairAndParse(loop.draft, createRepairFn(deps.chat, models.auxiliary));
  if (!repaired.ok) return { ok: false, reason: repaired.error.message, details: repaired.error.details };
  return finalize(repaired.data, facts, emit, loop.iterations, style);
};

const finalize = async (
  config: PortalConfig,
  facts: ReturnType<typeof parseWorkbook>,
  emit: ProgressEmitter,
  iterations: number,
  style: StyleStageDeps,
): Promise<ExtractionOutcome> => {
  const verified = verifyPortalConfig(config, facts);
  emit(progress("validate", "Locking in the confirmed portal draft"));
  const finalParse = parsePortalConfig(verified.config);
  if (!finalParse.ok) {
    return { ok: false, reason: finalParse.error.message, details: finalParse.error.details };
  }
  const styled = await applyStyle(finalParse.data, style);
  emit(progress("done", "Your portal draft is ready to review"));
  return { ok: true, config: styled, report: verified.report, iterations };
};
