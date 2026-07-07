import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseWorkbook } from "../parse/sheet-facts";
import type { WorkbookFacts } from "../types";
import { checkCaps } from "./caps";

const load = (file: string): WorkbookFacts =>
  parseWorkbook(new Uint8Array(readFileSync(join("fixtures", "excel-samples", file))));

describe("checkCaps", () => {
  it("passes a normal order workbook", () => {
    expect(checkCaps(load("purchase-order.xlsx"))).toBeNull();
  });

  it("passes a multi-sheet workbook under the sheet cap", () => {
    expect(checkCaps(load("gov-accountable-grant-budget.xlsx"))).toBeNull();
  });

  it("routes a macro-enabled workbook to needs-human", () => {
    const verdict = checkCaps(load("macro-workbook-vba.xlsm"));
    expect(verdict?.reason).toBe("macro-workbook");
  });

  it("routes a workbook with too many sheets to needs-human", () => {
    const base = load("purchase-order.xlsx");
    const many: WorkbookFacts = {
      ...base,
      sheetNames: Array.from({ length: 20 }, (_, index) => `Sheet${index}`),
    };
    expect(checkCaps(many)?.reason).toBe("too-many-sheets");
  });
});
