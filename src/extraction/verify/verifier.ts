import type { SheetFacts, WorkbookFacts } from "../types";
import {
  extractRefs,
  numericLiteralOperands,
  percentLiterals,
  splitTopLevelAdditive,
  stripEquals,
} from "./formula";

export type AnomalyKind = "hardcoded-total-constant" | "broken-reference";

export interface FormulaAnomaly {
  kind: AnomalyKind;
  sheet: string;
  ref: string;
  formula: string;
  literals: number[];
  message: string;
  question: string;
}

export interface TaxSignal {
  sheet: string;
  ref: string;
  ratePercent: number;
  formula: string;
}

const REF_PARTS = /^([A-Z]{1,3})(\d+)$/;

const colOf = (ref: string): string => REF_PARTS.exec(ref)?.[1] ?? "";
const rowOf = (ref: string): number => Number(REF_PARTS.exec(ref)?.[2] ?? "0");

const numericCells = (sheet: SheetFacts): Map<string, number> => {
  const map = new Map<string, number>();
  for (const cell of sheet.cells) {
    if (typeof cell.value === "number") map.set(cell.ref.toUpperCase(), cell.value);
  }
  return map;
};

const formulaRefs = (sheet: SheetFacts): Set<string> => {
  const set = new Set<string>();
  for (const formula of sheet.formulas) set.add(formula.ref.toUpperCase());
  return set;
};

const nearestOrphan = (
  totalRef: string,
  referenced: Set<string>,
  values: Map<string, number>,
  formulaCells: Set<string>,
): { ref: string; value: number } | undefined => {
  const column = colOf(totalRef);
  const totalRow = rowOf(totalRef);
  const referencedRows = [...referenced]
    .filter((ref) => colOf(ref) === column)
    .map(rowOf);
  if (referencedRows.length === 0) return undefined;
  const minRow = Math.min(...referencedRows);
  let best: { ref: string; value: number } | undefined;
  for (const [ref, value] of values) {
    if (colOf(ref) !== column) continue;
    const row = rowOf(ref);
    if (row <= minRow || row >= totalRow) continue;
    if (referenced.has(ref) || formulaCells.has(ref)) continue;
    if (best === undefined || row > rowOf(best.ref)) best = { ref, value };
  }
  return best;
};

const detectSheetAnomalies = (sheet: SheetFacts): FormulaAnomaly[] => {
  const anomalies: FormulaAnomaly[] = [];
  const values = numericCells(sheet);
  const formulaCells = formulaRefs(sheet);

  for (const formula of sheet.formulas) {
    const body = stripEquals(formula.formula);

    if (body.includes("#REF!")) {
      anomalies.push({
        kind: "broken-reference",
        sheet: sheet.name,
        ref: formula.ref,
        formula: formula.formula,
        literals: [],
        message: `${sheet.name}!${formula.ref} references a deleted cell (#REF!).`,
        question: `Cell ${formula.ref} points at a deleted reference — what should it total instead?`,
      });
      continue;
    }

    const operands = splitTopLevelAdditive(body);
    const refOperands = operands.filter((operand) => extractRefs(operand).length > 0);
    const literals = numericLiteralOperands(body);
    if (refOperands.length < 2 || literals.length === 0) continue;

    const referenced = new Set(extractRefs(body));
    const orphan = nearestOrphan(formula.ref, referenced, values, formulaCells);
    const literalText = literals.join(", ");
    const message =
      orphan === undefined
        ? `Total ${formula.ref} adds a hard-coded ${literalText} (=${body}) instead of a cell reference.`
        : `Total ${formula.ref} adds a hard-coded ${literalText}, but ${orphan.ref} (=${orphan.value}) sits unreferenced in the same column.`;
    const question =
      orphan === undefined
        ? `The total in ${formula.ref} bakes in ${literalText} as a constant — should this be a cell reference?`
        : `The total in ${formula.ref} adds ${literalText}, yet ${orphan.ref} holds ${orphan.value}. Should the total reference ${orphan.ref} instead?`;

    anomalies.push({
      kind: "hardcoded-total-constant",
      sheet: sheet.name,
      ref: formula.ref,
      formula: formula.formula,
      literals,
      message,
      question,
    });
  }

  return anomalies;
};

export const detectAnomalies = (workbook: WorkbookFacts): FormulaAnomaly[] =>
  workbook.sheets.flatMap(detectSheetAnomalies);

export const detectTaxSignals = (workbook: WorkbookFacts): TaxSignal[] => {
  const signals: TaxSignal[] = [];
  for (const sheet of workbook.sheets) {
    for (const formula of sheet.formulas) {
      for (const rate of percentLiterals(formula.formula)) {
        signals.push({ sheet: sheet.name, ref: formula.ref, ratePercent: rate, formula: formula.formula });
      }
    }
  }
  return signals;
};
