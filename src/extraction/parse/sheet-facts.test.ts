import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseWorkbook } from "./sheet-facts";

const fixture = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(join("fixtures", "excel-samples", name)));

describe("parseWorkbook", () => {
  it("extracts formulas and merges from the purchase order", () => {
    const facts = parseWorkbook(fixture("purchase-order.xlsx"));
    expect(facts.totals.formulaCount).toBe(12);
    expect(facts.totals.mergeCount).toBe(41);
    const total = facts.sheets[0]?.formulas.find((formula) => formula.ref === "F33");
    expect(total?.formula).toBe("F30+F31+31");
  });

  it("resolves named-range enums and protection on the reservation sheet", () => {
    const facts = parseWorkbook(fixture("group-room-reservation-list.xlsx"));
    const validations = facts.sheets.flatMap((sheet) => sheet.dataValidations);
    expect(validations).toHaveLength(6);
    const gender = validations.find((validation) => validation.enumSource === "Gender");
    expect(gender?.enumValues).toContain("Male");
    const protectedSheets = facts.sheets.filter((sheet) => sheet.protection !== null);
    expect(protectedSheets).toHaveLength(2);
  });

  it("flags workbooks that carry VBA macros", () => {
    expect(parseWorkbook(fixture("macro-workbook-vba.xlsm")).hasVba).toBe(true);
    expect(parseWorkbook(fixture("purchase-order.xlsx")).hasVba).toBe(false);
  });

  it("detects the conditional reorder business-state on the inventory tracker", () => {
    const facts = parseWorkbook(fixture("inventory-management-tracker.xlsx"));
    const reorder = facts.sheets
      .flatMap((sheet) => sheet.formulas)
      .find((formula) => /IF\([^)]*<[^)]*,\s*"REORDER"/i.test(formula.formula));
    expect(reorder).toBeDefined();
    const businessState = facts.sheets
      .flatMap((sheet) => sheet.conditionalFormats)
      .flatMap((cf) => cf.rules)
      .find((rule) => rule.type === "expression" && rule.formula?.includes("<"));
    expect(businessState).toBeDefined();
  });
});
