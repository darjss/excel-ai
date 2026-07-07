import type { SheetFacts, WorkbookFacts } from "../types";
import type { BuilderColumns, BuilderHints } from "./types";

const columnToNumber = (letters: string): number => {
  let value = 0;
  for (const char of letters.toUpperCase()) value = value * 26 + (char.charCodeAt(0) - 64);
  return value;
};

interface Bounds {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

const parseCell = (ref: string): { col: number; row: number } | null => {
  const match = ref.replace(/\$/g, "").toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (match === null) return null;
  return { col: columnToNumber(match[1] ?? ""), row: Number(match[2]) };
};

const parseRange = (range: string): Bounds | null => {
  const [start, end] = range.replace(/\$/g, "").toUpperCase().split(":");
  if (start === undefined) return null;
  const a = parseCell(start);
  const b = end !== undefined ? parseCell(end) : a;
  if (a === null || b === null) return null;
  return {
    minCol: Math.min(a.col, b.col),
    maxCol: Math.max(a.col, b.col),
    minRow: Math.min(a.row, b.row),
    maxRow: Math.max(a.row, b.row),
  };
};

const MAX_HINT_ROWS = 40;

const renderRegion = (sheet: SheetFacts, bounds: Bounds): string => {
  const byRow = new Map<number, Map<number, string>>();
  for (const cell of sheet.cells) {
    if (cell.col < bounds.minCol || cell.col > bounds.maxCol) continue;
    if (cell.row < bounds.minRow || cell.row > bounds.maxRow) continue;
    const row = byRow.get(cell.row) ?? new Map<number, string>();
    row.set(cell.col, cell.value === null ? "" : String(cell.value));
    byRow.set(cell.row, row);
  }
  const rowIndexes = [...byRow.keys()].sort((a, b) => a - b).slice(0, MAX_HINT_ROWS);
  return rowIndexes
    .map((rowIndex) => {
      const row = byRow.get(rowIndex) ?? new Map<number, string>();
      const cells: string[] = [];
      for (let c = bounds.minCol; c <= bounds.maxCol; c += 1) cells.push(row.get(c) ?? "");
      return `Row ${rowIndex}: ${cells.join(" | ")}`;
    })
    .join("\n");
};

const roleLabels: Record<keyof BuilderColumns, string> = {
  product: "product name",
  price: "unit price",
  unit: "unit of sale",
  category: "category",
};

const renderColumns = (columns: BuilderColumns): string =>
  (Object.keys(roleLabels) as (keyof BuilderColumns)[])
    .filter((role) => columns[role] !== undefined)
    .map((role) => `- Column ${columns[role]} is the ${roleLabels[role]}.`)
    .join("\n");

export const renderHints = (hints: BuilderHints, facts: WorkbookFacts): string => {
  const sheet = facts.sheets.find((entry) => entry.name === hints.sheet);
  const bounds = parseRange(hints.range);
  const region = sheet !== undefined && bounds !== null ? renderRegion(sheet, bounds) : "";
  const lines = [
    "# Supplier-confirmed product table (authoritative)",
    `The supplier has told us the product list lives on sheet "${hints.sheet}" in range ${hints.range}.`,
    "Build the catalog ONLY from this region and treat these column roles as authoritative — do not look elsewhere for products:",
    renderColumns(hints.columns),
  ];
  if (region.length > 0) {
    lines.push("", "The confirmed region contains:", region);
  }
  return lines.join("\n");
};
