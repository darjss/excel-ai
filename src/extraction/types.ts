export type CellValue = string | number | boolean | null;

export type CellKind = "s" | "n" | "b" | "d" | "e" | "z";

export interface CellFact {
  ref: string;
  row: number;
  col: number;
  value: CellValue;
  kind: CellKind;
}

export interface FormulaFact {
  ref: string;
  sheet: string;
  formula: string;
  value: CellValue;
}

export interface MergeFact {
  range: string;
}

export interface DataValidationFact {
  type: string;
  sqref: string[];
  operator?: string;
  formula1?: string;
  formula2?: string;
  allowBlank: boolean;
  prompt?: string;
  enumValues?: string[];
  enumSource?: string;
}

export interface ConditionalRuleFact {
  type: string;
  operator?: string;
  formula?: string;
}

export interface ConditionalFormatFact {
  sqref: string;
  rules: ConditionalRuleFact[];
}

export interface ProtectionFact {
  sheet: string;
  algorithmName?: string;
  selectLockedCells: boolean;
  selectUnlockedCells: boolean;
  flags: Record<string, string>;
}

export interface DefinedNameFact {
  name: string;
  ref: string;
  broken: boolean;
}

export interface SheetFacts {
  name: string;
  index: number;
  dimension: string | null;
  rowCount: number;
  colCount: number;
  cells: CellFact[];
  cellsTruncated: boolean;
  formulas: FormulaFact[];
  merges: MergeFact[];
  dataValidations: DataValidationFact[];
  conditionalFormats: ConditionalFormatFact[];
  protection: ProtectionFact | null;
}

export interface WorkbookTotals {
  formulaCount: number;
  mergeCount: number;
  validationCount: number;
  conditionalFormatCount: number;
}

export interface WorkbookFacts {
  sheetNames: string[];
  sheets: SheetFacts[];
  definedNames: DefinedNameFact[];
  hasVba: boolean;
  totals: WorkbookTotals;
}
