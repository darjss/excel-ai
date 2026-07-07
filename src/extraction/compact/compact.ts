import type { CellValue, SheetFacts, WorkbookFacts } from "../types";

const MAX_SAMPLE_ROWS = 5;
const MAX_GROUP_REFS = 12;
const MAX_ENUM_VALUES = 24;
const MAX_MERGE_SAMPLES = 6;

export interface FormulaGroup {
  pattern: string;
  example: string;
  refs: string[];
  count: number;
  sampleValue: CellValue;
}

export interface CompactValidation {
  type: string;
  sqref: string;
  enumValues?: string[];
  enumSource?: string;
}

export interface CompactSheet {
  name: string;
  dimension: string | null;
  headers: string[];
  sampleRows: string[][];
  formulaGroups: FormulaGroup[];
  formulaCount: number;
  validations: CompactValidation[];
  mergeCount: number;
  mergeSamples: string[];
  conditionalSummaries: string[];
  protection: string | null;
}

export interface CompactFacts {
  sheetNames: string[];
  hasVba: boolean;
  definedNames: { name: string; ref: string; broken: boolean }[];
  sheets: CompactSheet[];
}

const normalizePattern = (formula: string): string =>
  formula.replace(/(\$?[A-Z]{1,3}\$?)\d+/g, "$1#");

const cellText = (value: CellValue): string => {
  if (value === null) return "";
  return String(value);
};

const buildRows = (sheet: SheetFacts): string[][] => {
  const byRow = new Map<number, Map<number, string>>();
  for (const cell of sheet.cells) {
    const row = byRow.get(cell.row) ?? new Map<number, string>();
    row.set(cell.col, cellText(cell.value));
    byRow.set(cell.row, row);
  }
  const orderedRows = [...byRow.keys()].sort((a, b) => a - b).slice(0, MAX_SAMPLE_ROWS + 1);
  const maxCol = Math.min(sheet.colCount, 26);
  return orderedRows.map((rowIndex) => {
    const row = byRow.get(rowIndex) ?? new Map<number, string>();
    const cells: string[] = [];
    for (let c = 1; c <= maxCol; c += 1) cells.push(row.get(c) ?? "");
    return cells;
  });
};

const groupFormulas = (sheet: SheetFacts): FormulaGroup[] => {
  const groups = new Map<string, FormulaGroup>();
  for (const formula of sheet.formulas) {
    const pattern = normalizePattern(formula.formula);
    const existing = groups.get(pattern);
    if (existing === undefined) {
      groups.set(pattern, {
        pattern,
        example: formula.formula,
        refs: [formula.ref],
        count: 1,
        sampleValue: formula.value,
      });
    } else {
      existing.count += 1;
      if (existing.refs.length < MAX_GROUP_REFS) existing.refs.push(formula.ref);
    }
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
};

const compactValidations = (sheet: SheetFacts): CompactValidation[] =>
  sheet.dataValidations.map((validation) => ({
    type: validation.type,
    sqref: validation.sqref[0] ?? "",
    enumValues: validation.enumValues?.slice(0, MAX_ENUM_VALUES),
    enumSource: validation.enumSource,
  }));

const conditionalSummaries = (sheet: SheetFacts): string[] => {
  const summaries = new Map<string, number>();
  for (const cf of sheet.conditionalFormats) {
    for (const rule of cf.rules) {
      const key = rule.formula !== undefined ? `${rule.type}: ${rule.formula}` : rule.type;
      summaries.set(key, (summaries.get(key) ?? 0) + 1);
    }
  }
  return [...summaries.entries()].map(([key, count]) => (count > 1 ? `${key} (×${count})` : key));
};

const protectionSummary = (sheet: SheetFacts): string | null => {
  const protection = sheet.protection;
  if (protection === null) return null;
  const encrypted = protection.algorithmName !== undefined ? ` (${protection.algorithmName})` : "";
  return `protected${encrypted}; locked cells selectable: ${protection.selectLockedCells}`;
};

const findHeaderRow = (rows: string[][]): string[] => {
  for (const row of rows) {
    const filled = row.filter((cell) => cell.length > 0).length;
    if (filled >= 2) return row;
  }
  return rows[0] ?? [];
};

const compactSheet = (sheet: SheetFacts): CompactSheet => {
  const rows = buildRows(sheet);
  const headers = findHeaderRow(rows);
  const headerIndex = rows.indexOf(headers);
  const sampleRows = rows.slice(headerIndex + 1, headerIndex + 1 + MAX_SAMPLE_ROWS);
  return {
    name: sheet.name,
    dimension: sheet.dimension,
    headers,
    sampleRows,
    formulaGroups: groupFormulas(sheet),
    formulaCount: sheet.formulas.length,
    validations: compactValidations(sheet),
    mergeCount: sheet.merges.length,
    mergeSamples: sheet.merges.slice(0, MAX_MERGE_SAMPLES).map((merge) => merge.range),
    conditionalSummaries: conditionalSummaries(sheet),
    protection: protectionSummary(sheet),
  };
};

export const compactWorkbook = (facts: WorkbookFacts): CompactFacts => ({
  sheetNames: facts.sheetNames,
  hasVba: facts.hasVba,
  definedNames: facts.definedNames.map((name) => ({
    name: name.name,
    ref: name.ref,
    broken: name.broken,
  })),
  sheets: facts.sheets.map(compactSheet),
});

const renderSheet = (sheet: CompactSheet): string => {
  const lines: string[] = [`## Sheet: ${sheet.name} (${sheet.dimension ?? "empty"})`];
  if (sheet.headers.some((cell) => cell.length > 0)) {
    lines.push(`Headers: ${sheet.headers.filter((cell) => cell.length > 0).join(" | ")}`);
  }
  for (const row of sheet.sampleRows) {
    if (row.some((cell) => cell.length > 0)) lines.push(`Row: ${row.join(" | ")}`);
  }
  if (sheet.formulaGroups.length > 0) {
    lines.push(`Formulas (${sheet.formulaCount} total, ${sheet.formulaGroups.length} patterns):`);
    for (const group of sheet.formulaGroups) {
      lines.push(`  ${group.example} [${group.pattern}] ×${group.count} e.g. ${group.refs.slice(0, 4).join(",")}`);
    }
  }
  for (const validation of sheet.validations) {
    const values = validation.enumValues !== undefined ? ` = {${validation.enumValues.join(", ")}}` : "";
    const source = validation.enumSource !== undefined ? ` [${validation.enumSource}]` : "";
    lines.push(`Validation ${validation.type} @ ${validation.sqref}${values}${source}`);
  }
  if (sheet.mergeCount > 0) lines.push(`Merges: ${sheet.mergeCount} (${sheet.mergeSamples.join(", ")})`);
  for (const summary of sheet.conditionalSummaries) lines.push(`Conditional: ${summary}`);
  if (sheet.protection !== null) lines.push(`Protection: ${sheet.protection}`);
  return lines.join("\n");
};

export const renderPrompt = (compact: CompactFacts): string => {
  const lines: string[] = [`# Workbook facts`, `Sheets: ${compact.sheetNames.join(", ")}`];
  if (compact.hasVba) lines.push(`Contains VBA macros.`);
  const usableNames = compact.definedNames.filter((name) => !name.broken);
  if (usableNames.length > 0) {
    lines.push(`Named ranges: ${usableNames.map((name) => `${name.name}=${name.ref}`).join("; ")}`);
  }
  for (const sheet of compact.sheets) lines.push("", renderSheet(sheet));
  return lines.join("\n");
};

export const promptSize = (compact: CompactFacts): number => renderPrompt(compact).length;
