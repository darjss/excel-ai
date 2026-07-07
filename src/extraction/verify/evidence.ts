import type { FormulaFact, SheetFacts, WorkbookFacts } from "../types";

interface RangeBounds {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

const REF = /^\$?([A-Z]{1,3})\$?(\d+)$/;

const colToNum = (col: string): number => {
  let total = 0;
  for (const ch of col.toUpperCase()) total = total * 26 + (ch.charCodeAt(0) - 64);
  return total;
};

const parseRef = (ref: string): { col: number; row: number } | undefined => {
  const match = REF.exec(ref.trim().toUpperCase());
  if (match === null) return undefined;
  return { col: colToNum(match[1] ?? ""), row: Number(match[2]) };
};

const parseRange = (range: string): RangeBounds | undefined => {
  const parts = range.trim().toUpperCase().split(":");
  const start = parseRef(parts[0] ?? "");
  if (start === undefined) return undefined;
  const end = parts.length > 1 ? parseRef(parts[1] ?? "") : start;
  if (end === undefined) return undefined;
  return {
    minCol: Math.min(start.col, end.col),
    maxCol: Math.max(start.col, end.col),
    minRow: Math.min(start.row, end.row),
    maxRow: Math.max(start.row, end.row),
  };
};

const withinBounds = (ref: string, bounds: RangeBounds): boolean => {
  const parsed = parseRef(ref);
  if (parsed === undefined) return false;
  return (
    parsed.col >= bounds.minCol &&
    parsed.col <= bounds.maxCol &&
    parsed.row >= bounds.minRow &&
    parsed.row <= bounds.maxRow
  );
};

export interface RangeEvidence {
  hasAny: boolean;
  formulas: FormulaFact[];
  literals: number[];
  numericValues: number[];
}

const EMPTY_EVIDENCE: RangeEvidence = {
  hasAny: false,
  formulas: [],
  literals: [],
  numericValues: [],
};

export const collectRangeEvidence = (
  facts: WorkbookFacts,
  sheetName: string,
  range: string,
): RangeEvidence => {
  const sheet: SheetFacts | undefined = facts.sheets.find((candidate) => candidate.name === sheetName);
  if (sheet === undefined) return EMPTY_EVIDENCE;
  const bounds = parseRange(range);
  if (bounds === undefined) return EMPTY_EVIDENCE;

  const formulaRefs = new Set(sheet.formulas.map((formula) => formula.ref.toUpperCase()));
  const formulas = sheet.formulas.filter((formula) => withinBounds(formula.ref, bounds));

  const literals: number[] = [];
  const numericValues: number[] = [];
  let cellCount = 0;
  for (const cell of sheet.cells) {
    if (!withinBounds(cell.ref, bounds)) continue;
    cellCount += 1;
    if (typeof cell.value !== "number") continue;
    numericValues.push(cell.value);
    if (!formulaRefs.has(cell.ref.toUpperCase())) literals.push(cell.value);
  }

  return {
    hasAny: cellCount > 0 || formulas.length > 0,
    formulas,
    literals,
    numericValues,
  };
};
