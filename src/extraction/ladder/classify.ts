import type { CompactFacts } from "../compact/compact";
import type { ChatFn } from "../agent/models";
import type { SheetFacts, WorkbookFacts } from "../types";
import type { SpeciesSignals, SpeciesVerdict } from "./types";

const PRICE_HEADER =
  /\b(price|amount|cost|rate|subtotal|total|qty|quantity|unit|sku|item|product|description|each|per)\b/i;

const MIN_NUMERIC_CELLS = 3;
const MIN_TEXT_CELLS = 8;
const PROSE_LENGTH = 60;

interface SheetSignal {
  numericColumns: number;
  priceHeaderHits: number;
  formulaCount: number;
  validationCount: number;
  textCells: number;
  filledColumns: number;
  prose: boolean;
}

const numericColumnsOf = (sheet: SheetFacts): number => {
  const numeric = new Map<number, number>();
  const text = new Map<number, number>();
  for (const cell of sheet.cells) {
    if (cell.value === null) continue;
    if (cell.kind === "n") numeric.set(cell.col, (numeric.get(cell.col) ?? 0) + 1);
    else if (cell.kind === "s") text.set(cell.col, (text.get(cell.col) ?? 0) + 1);
  }
  let count = 0;
  for (const [col, num] of numeric) {
    if (num >= MIN_NUMERIC_CELLS && num >= (text.get(col) ?? 0)) count += 1;
  }
  return count;
};

const sheetSignal = (sheet: SheetFacts, headers: string[]): SheetSignal => {
  const filled = new Set<number>();
  let textCells = 0;
  let textLength = 0;
  for (const cell of sheet.cells) {
    if (cell.value === null || String(cell.value).trim().length === 0) continue;
    filled.add(cell.col);
    if (cell.kind === "s") {
      textCells += 1;
      textLength += String(cell.value).length;
    }
  }
  return {
    numericColumns: numericColumnsOf(sheet),
    priceHeaderHits: headers.filter((header) => PRICE_HEADER.test(header)).length,
    formulaCount: sheet.formulas.length,
    validationCount: sheet.dataValidations.length,
    textCells,
    filledColumns: filled.size,
    prose: textCells > 0 && textLength / textCells >= PROSE_LENGTH,
  };
};

const aggregate = (signals: SheetSignal[]): SpeciesSignals => ({
  numericColumns: signals.reduce((sum, s) => sum + s.numericColumns, 0),
  priceHeaderHits: signals.reduce((sum, s) => sum + s.priceHeaderHits, 0),
  formulaCount: signals.reduce((sum, s) => sum + s.formulaCount, 0),
  validationCount: signals.reduce((sum, s) => sum + s.validationCount, 0),
  textCells: signals.reduce((sum, s) => sum + s.textCells, 0),
});

const looksLikeOrderSheet = (signals: SheetSignal[]): boolean =>
  signals.some(
    (s) =>
      (s.priceHeaderHits >= 2 && s.numericColumns >= 1) ||
      (s.formulaCount >= 5 && s.numericColumns >= 1) ||
      s.validationCount >= 3,
  );

const looksLikeProse = (signals: SheetSignal[]): boolean => {
  const barren = signals.every(
    (s) =>
      s.formulaCount === 0 &&
      s.validationCount === 0 &&
      s.numericColumns === 0 &&
      s.priceHeaderHits === 0,
  );
  const proseShaped = signals.some((s) => s.prose || s.filledColumns <= 1);
  return barren && proseShaped;
};

const CLASSIFY_SYSTEM_PROMPT =
  "You classify whether a spreadsheet is a product order form or price sheet a wholesaler could sell from. Reply with a single JSON object {\"isOrderSheet\": boolean} and nothing else.";

const parseClassification = (content: string): boolean | null => {
  const match = content.match(/\{[\s\S]*\}/);
  if (match === null) return null;
  try {
    const parsed: unknown = JSON.parse(match[0]);
    if (typeof parsed === "object" && parsed !== null && "isOrderSheet" in parsed) {
      const value = (parsed as { isOrderSheet: unknown }).isOrderSheet;
      return typeof value === "boolean" ? value : null;
    }
  } catch {
    return null;
  }
  return null;
};

const renderClassifyPrompt = (compact: CompactFacts): string => {
  const lines: string[] = [`Sheets: ${compact.sheetNames.join(", ")}`];
  for (const sheet of compact.sheets) {
    lines.push(`## ${sheet.name}`);
    if (sheet.headers.some((cell) => cell.length > 0)) {
      lines.push(`Headers: ${sheet.headers.filter((cell) => cell.length > 0).join(" | ")}`);
    }
    for (const row of sheet.sampleRows.slice(0, 3)) {
      if (row.some((cell) => cell.length > 0)) lines.push(`Row: ${row.join(" | ")}`);
    }
    lines.push(`Formulas: ${sheet.formulaCount}, validations: ${sheet.validations.length}`);
  }
  return lines.join("\n");
};

export interface ClassifyDeps {
  chat: ChatFn;
  model: string;
}

export const classifySpecies = async (
  facts: WorkbookFacts,
  compact: CompactFacts,
  deps: ClassifyDeps,
): Promise<SpeciesVerdict> => {
  const signals = facts.sheets.map((sheet, index) =>
    sheetSignal(sheet, compact.sheets[index]?.headers ?? []),
  );
  const aggregated = aggregate(signals);

  if (looksLikeOrderSheet(signals)) {
    return { verdict: "order-sheet", method: "deterministic", signals: aggregated };
  }
  if (aggregated.textCells >= MIN_TEXT_CELLS && looksLikeProse(signals)) {
    return { verdict: "not-order-sheet", method: "deterministic", signals: aggregated };
  }

  try {
    const result = await deps.chat({
      model: deps.model,
      maxCompletionTokens: 512,
      temperature: 0,
      messages: [
        { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
        { role: "user", content: renderClassifyPrompt(compact) },
      ],
    });
    const isOrderSheet = parseClassification(result.content);
    if (isOrderSheet === null) {
      return { verdict: "order-sheet", method: "fallback", signals: aggregated };
    }
    return {
      verdict: isOrderSheet ? "order-sheet" : "not-order-sheet",
      method: "model",
      signals: aggregated,
    };
  } catch {
    return { verdict: "order-sheet", method: "fallback", signals: aggregated };
  }
};
