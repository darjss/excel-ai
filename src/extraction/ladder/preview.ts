import type { SheetFacts, WorkbookFacts } from "../types";
import type { SheetPreview } from "./types";

const MAX_PREVIEW_ROWS = 20;
const MAX_PREVIEW_COLS = 12;

const columnLetter = (index: number): string => {
  let value = index;
  let letters = "";
  while (value >= 0) {
    letters = String.fromCharCode(65 + (value % 26)) + letters;
    value = Math.floor(value / 26) - 1;
  }
  return letters;
};

const cellText = (value: SheetFacts["cells"][number]["value"]): string =>
  value === null ? "" : String(value);

const previewSheet = (sheet: SheetFacts): SheetPreview => {
  const maxCol = Math.min(Math.max(sheet.colCount, 1), MAX_PREVIEW_COLS);
  const byRow = new Map<number, Map<number, string>>();
  for (const cell of sheet.cells) {
    if (cell.col > maxCol) continue;
    const row = byRow.get(cell.row) ?? new Map<number, string>();
    row.set(cell.col, cellText(cell.value));
    byRow.set(cell.row, row);
  }
  const rowIndexes = [...byRow.keys()].sort((a, b) => a - b).slice(0, MAX_PREVIEW_ROWS);
  const rows = rowIndexes.map((rowIndex) => {
    const row = byRow.get(rowIndex) ?? new Map<number, string>();
    const cells: string[] = [];
    for (let c = 1; c <= maxCol; c += 1) cells.push(row.get(c) ?? "");
    return cells;
  });
  const columns: string[] = [];
  for (let c = 0; c < maxCol; c += 1) columns.push(columnLetter(c));
  return { sheet: sheet.name, dimension: sheet.dimension, columns, rows };
};

export const buildSheetPreview = (facts: WorkbookFacts): SheetPreview[] =>
  facts.sheets.map(previewSheet);
