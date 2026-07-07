import type { WorkbookFacts } from "../types";
import type { ToolSchema } from "./models";

export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    type: "function",
    function: {
      name: "readRegion",
      description: "Read the raw cell values in a rectangular A1 range of a sheet.",
      parameters: {
        type: "object",
        properties: {
          sheet: { type: "string", description: "Sheet name" },
          range: { type: "string", description: "A1 range, e.g. B20:F33" },
        },
        required: ["sheet", "range"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listFormulas",
      description: "List the distinct formula patterns in a sheet (or the whole workbook) with example cells.",
      parameters: {
        type: "object",
        properties: { sheet: { type: "string", description: "Optional sheet name" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listValidations",
      description: "List data-validation blocks and their resolved allowed values.",
      parameters: {
        type: "object",
        properties: { sheet: { type: "string", description: "Optional sheet name" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "proposeDraft",
      description: "Submit the final draft PortalConfig once extraction is complete.",
      parameters: {
        type: "object",
        properties: { draft: { type: "object", description: "The draft PortalConfig object" } },
        required: ["draft"],
      },
    },
  },
];

const COL = /^[A-Z]+/;

const columnToNumber = (letters: string): number => {
  let value = 0;
  for (const char of letters) value = value * 26 + (char.charCodeAt(0) - 64);
  return value;
};

interface RangeBounds {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

const parseRange = (range: string): RangeBounds | null => {
  const [start, end] = range.replace(/\$/g, "").toUpperCase().split(":");
  if (start === undefined) return null;
  const parse = (ref: string): { col: number; row: number } | null => {
    const letters = COL.exec(ref)?.[0];
    const row = Number(ref.replace(/^[A-Z]+/, ""));
    if (letters === undefined || Number.isNaN(row)) return null;
    return { col: columnToNumber(letters), row };
  };
  const a = parse(start);
  const b = end !== undefined ? parse(end) : a;
  if (a === null || b === null) return null;
  return {
    minCol: Math.min(a.col, b.col),
    maxCol: Math.max(a.col, b.col),
    minRow: Math.min(a.row, b.row),
    maxRow: Math.max(a.row, b.row),
  };
};

const findSheet = (facts: WorkbookFacts, name: string | undefined) =>
  name === undefined ? undefined : facts.sheets.find((sheet) => sheet.name === name);

const readRegion = (facts: WorkbookFacts, sheetName: string, range: string): string => {
  const sheet = findSheet(facts, sheetName);
  if (sheet === undefined) return JSON.stringify({ error: `Unknown sheet "${sheetName}"` });
  const bounds = parseRange(range);
  if (bounds === null) return JSON.stringify({ error: `Unparseable range "${range}"` });
  const formulaByRef = new Map(sheet.formulas.map((formula) => [formula.ref, formula.formula]));
  const cells = sheet.cells
    .filter((cell) => cell.col >= bounds.minCol && cell.col <= bounds.maxCol && cell.row >= bounds.minRow && cell.row <= bounds.maxRow)
    .slice(0, 300)
    .map((cell) => {
      const formula = formulaByRef.get(cell.ref);
      return formula !== undefined
        ? { ref: cell.ref, value: cell.value, formula: `=${formula}` }
        : { ref: cell.ref, value: cell.value };
    });
  return JSON.stringify({ sheet: sheetName, range, cells });
};

const listFormulas = (facts: WorkbookFacts, sheetName: string | undefined): string => {
  const sheets = sheetName === undefined ? facts.sheets : facts.sheets.filter((sheet) => sheet.name === sheetName);
  const output = sheets.map((sheet) => {
    const groups = new Map<string, { example: string; refs: string[]; count: number }>();
    for (const formula of sheet.formulas) {
      const pattern = formula.formula.replace(/(\$?[A-Z]{1,3}\$?)\d+/g, "$1#");
      const group = groups.get(pattern) ?? { example: `=${formula.formula}`, refs: [], count: 0 };
      group.count += 1;
      if (group.refs.length < 6) group.refs.push(formula.ref);
      groups.set(pattern, group);
    }
    return { sheet: sheet.name, patterns: [...groups.values()] };
  });
  return JSON.stringify(output);
};

const listValidations = (facts: WorkbookFacts, sheetName: string | undefined): string => {
  const sheets = sheetName === undefined ? facts.sheets : facts.sheets.filter((sheet) => sheet.name === sheetName);
  const output = sheets.flatMap((sheet) =>
    sheet.dataValidations.map((validation) => ({
      sheet: sheet.name,
      type: validation.type,
      sqref: validation.sqref,
      allowed: validation.enumValues,
      source: validation.enumSource,
    })),
  );
  return JSON.stringify(output);
};

export interface ToolExecution {
  execute: (name: string, args: Record<string, unknown>) => string;
  getDraft: () => unknown;
}

export const createToolExecution = (facts: WorkbookFacts): ToolExecution => {
  let draft: unknown;
  const execute = (name: string, args: Record<string, unknown>): string => {
    if (name === "readRegion") {
      return readRegion(facts, String(args.sheet ?? ""), String(args.range ?? ""));
    }
    if (name === "listFormulas") {
      return listFormulas(facts, args.sheet === undefined ? undefined : String(args.sheet));
    }
    if (name === "listValidations") {
      return listValidations(facts, args.sheet === undefined ? undefined : String(args.sheet));
    }
    if (name === "proposeDraft") {
      draft = args.draft;
      return JSON.stringify({ ok: true, message: "Draft received." });
    }
    return JSON.stringify({ error: `Unknown tool "${name}"` });
  };
  return { execute, getDraft: () => draft };
};
