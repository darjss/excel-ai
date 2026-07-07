import * as XLSX from "xlsx";
import type {
  CellFact,
  CellKind,
  CellValue,
  DataValidationFact,
  DefinedNameFact,
  FormulaFact,
  MergeFact,
  SheetFacts,
  WorkbookFacts,
} from "../types";
import { extractConditionalFormats } from "./conditional-format";
import { extractProtection } from "./protection";
import { extractDataValidations } from "./validations";
import { readWorkbookXml } from "./workbook-xml";

const CELL_CAP = 4000;

const toCellKind = (kind: string | undefined): CellKind => {
  if (kind === "n" || kind === "b" || kind === "d" || kind === "e" || kind === "z") return kind;
  return "s";
};

const toCellValue = (cell: XLSX.CellObject): CellValue => {
  const value = cell.v;
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  return String(value);
};

const parseDefinedNames = (workbook: XLSX.WorkBook): DefinedNameFact[] => {
  const names = workbook.Workbook?.Names ?? [];
  return names
    .filter((entry): entry is { Name: string; Ref: string } =>
      typeof entry.Name === "string" && typeof entry.Ref === "string",
    )
    .map((entry) => ({
      name: entry.Name,
      ref: entry.Ref,
      broken: entry.Ref.includes("#REF!"),
    }));
};

const stripSheetName = (raw: string): string => raw.replace(/^'(.*)'$/, "$1");

const readRange = (workbook: XLSX.WorkBook, ref: string): string[] => {
  const bang = ref.lastIndexOf("!");
  if (bang === -1) return [];
  const sheetName = stripSheetName(ref.slice(0, bang));
  const a1 = ref.slice(bang + 1).replace(/\$/g, "");
  if (a1.includes("#REF!")) return [];
  const sheet = workbook.Sheets[sheetName];
  if (sheet === undefined) return [];
  const range = XLSX.utils.decode_range(a1);
  const values: string[] = [];
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
      if (cell === undefined) continue;
      const value = toCellValue(cell);
      if (value === null) continue;
      const text = String(value).trim();
      if (text.length > 0) values.push(text);
    }
  }
  return values;
};

interface EnumResolution {
  values: string[];
  source: string;
}

const resolveEnum = (
  formula1: string,
  definedNames: DefinedNameFact[],
  workbook: XLSX.WorkBook,
): EnumResolution | undefined => {
  const trimmed = formula1.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const values = trimmed
      .slice(1, -1)
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    return values.length > 0 ? { values, source: "inline" } : undefined;
  }

  const named = definedNames.find((entry) => entry.name.toLowerCase() === trimmed.toLowerCase());
  if (named !== undefined) {
    if (named.broken) return undefined;
    const values = readRange(workbook, named.ref);
    return values.length > 0 ? { values, source: named.name } : undefined;
  }

  if (trimmed.includes("!")) {
    const values = readRange(workbook, trimmed);
    return values.length > 0 ? { values, source: trimmed } : undefined;
  }

  return undefined;
};

const resolveValidationEnums = (
  validations: DataValidationFact[],
  definedNames: DefinedNameFact[],
  workbook: XLSX.WorkBook,
): DataValidationFact[] =>
  validations.map((validation) => {
    if (validation.type !== "list" || validation.formula1 === undefined) return validation;
    const resolved = resolveEnum(validation.formula1, definedNames, workbook);
    if (resolved === undefined) return validation;
    return { ...validation, enumValues: resolved.values, enumSource: resolved.source };
  });

const buildSheetCells = (
  sheet: XLSX.WorkSheet,
  sheetName: string,
): { cells: CellFact[]; formulas: FormulaFact[]; truncated: boolean } => {
  const cells: CellFact[] = [];
  const formulas: FormulaFact[] = [];
  let truncated = false;

  const addresses = Object.keys(sheet)
    .filter((key) => key[0] !== "!")
    .sort(compareAddresses);

  for (const address of addresses) {
    const cell = sheet[address] as XLSX.CellObject;
    const decoded = XLSX.utils.decode_cell(address);
    if (typeof cell.f === "string" && cell.f.length > 0) {
      formulas.push({
        ref: address,
        sheet: sheetName,
        formula: cell.f,
        value: toCellValue(cell),
      });
    }
    if (cells.length < CELL_CAP) {
      cells.push({
        ref: address,
        row: decoded.r + 1,
        col: decoded.c + 1,
        value: toCellValue(cell),
        kind: toCellKind(cell.t),
      });
    } else {
      truncated = true;
    }
  }

  return { cells, formulas, truncated };
};

const compareAddresses = (a: string, b: string): number => {
  const da = XLSX.utils.decode_cell(a);
  const db = XLSX.utils.decode_cell(b);
  if (da.r !== db.r) return da.r - db.r;
  return da.c - db.c;
};

const buildMerges = (sheet: XLSX.WorkSheet): MergeFact[] => {
  const merges = sheet["!merges"] ?? [];
  return merges.map((merge) => ({ range: XLSX.utils.encode_range(merge) }));
};

const dimensionSize = (dimension: string | null): { rows: number; cols: number } => {
  if (dimension === null) return { rows: 0, cols: 0 };
  const range = XLSX.utils.decode_range(dimension);
  return { rows: range.e.r - range.s.r + 1, cols: range.e.c - range.s.c + 1 };
};

const emptySheet = (name: string, index: number): SheetFacts => ({
  name,
  index,
  dimension: null,
  rowCount: 0,
  colCount: 0,
  cells: [],
  cellsTruncated: false,
  formulas: [],
  merges: [],
  dataValidations: [],
  conditionalFormats: [],
  protection: null,
});

export const parseWorkbook = (bytes: Uint8Array): WorkbookFacts => {
  const workbook = XLSX.read(bytes, { type: "array", cellFormula: true, cellNF: false });
  const { sheets: sheetXml, hasVba } = readWorkbookXml(bytes);
  const definedNames = parseDefinedNames(workbook);
  const xmlByName = new Map(sheetXml.map((entry) => [entry.name, entry.xml]));

  const sheets: SheetFacts[] = workbook.SheetNames.map((name, index) => {
    const sheet = workbook.Sheets[name];
    const xml = xmlByName.get(name) ?? "";
    if (sheet === undefined) return emptySheet(name, index);
    const dimension = typeof sheet["!ref"] === "string" ? sheet["!ref"] : null;
    const { rows, cols } = dimensionSize(dimension);
    const { cells, formulas, truncated } = buildSheetCells(sheet, name);
    const dataValidations = resolveValidationEnums(
      extractDataValidations(xml),
      definedNames,
      workbook,
    );
    return {
      name,
      index,
      dimension,
      rowCount: rows,
      colCount: cols,
      cells,
      cellsTruncated: truncated,
      formulas,
      merges: buildMerges(sheet),
      dataValidations,
      conditionalFormats: extractConditionalFormats(xml),
      protection: extractProtection(name, xml),
    };
  });

  const totals = sheets.reduce(
    (acc, sheet) => ({
      formulaCount: acc.formulaCount + sheet.formulas.length,
      mergeCount: acc.mergeCount + sheet.merges.length,
      validationCount: acc.validationCount + sheet.dataValidations.length,
      conditionalFormatCount: acc.conditionalFormatCount + sheet.conditionalFormats.length,
    }),
    { formulaCount: 0, mergeCount: 0, validationCount: 0, conditionalFormatCount: 0 },
  );

  return { sheetNames: workbook.SheetNames, sheets, definedNames, hasVba, totals };
};
