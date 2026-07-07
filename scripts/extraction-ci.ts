import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compactWorkbook, promptSize } from "../src/extraction/compact/compact";
import { parseWorkbook } from "../src/extraction/parse/sheet-facts";
import type { WorkbookFacts } from "../src/extraction/types";
import { detectAnomalies, detectTaxSignals } from "../src/extraction/verify/verifier";

interface FixtureExpectation {
  sheets: number;
  formulas: number;
  merges: number;
  minValidations: number;
  vba: boolean;
}

const EXPECTATIONS: Record<string, FixtureExpectation> = {
  "clothing-inventory-list.xlsx": { sheets: 6, formulas: 82, merges: 16, minValidations: 0, vba: false },
  "exceldatapro-purchase-order.xlsx": { sheets: 1, formulas: 23, merges: 23, minValidations: 1, vba: false },
  "gov-accountable-grant-budget.xlsx": { sheets: 9, formulas: 1074, merges: 34, minValidations: 2, vba: false },
  "gov-innovate-finance-spreadsheet.xlsx": { sheets: 9, formulas: 883, merges: 8, minValidations: 16, vba: false },
  "gov-rrf-budget-template.xlsx": { sheets: 5, formulas: 4023, merges: 165, minValidations: 2, vba: false },
  "gov-sipf-financial-costing.xlsx": { sheets: 9, formulas: 170, merges: 20, minValidations: 1, vba: false },
  "group-room-reservation-list.xlsx": { sheets: 2, formulas: 0, merges: 16, minValidations: 6, vba: false },
  "hubspot-order-form.xlsx": { sheets: 2, formulas: 9, merges: 40, minValidations: 0, vba: false },
  "inventory-management-tracker.xlsx": { sheets: 4, formulas: 69, merges: 30, minValidations: 0, vba: false },
  "macro-workbook-vba.xlsm": { sheets: 1, formulas: 0, merges: 0, minValidations: 0, vba: true },
  "purchase-order.xlsx": { sheets: 1, formulas: 12, merges: 41, minValidations: 0, vba: false },
  "residential-construction-estimate.xlsx": { sheets: 2, formulas: 1552, merges: 11, minValidations: 1, vba: false },
  "sales-order-form.xlsx": { sheets: 3, formulas: 30, merges: 15, minValidations: 0, vba: false },
};

const PROMPT_CHAR_CAP = 120_000;
const fixturesDir = join(import.meta.dirname, "..", "fixtures", "excel-samples");

let failures = 0;
const check = (label: string, condition: boolean, detail?: string): void => {
  if (condition) {
    console.log(`  ok   ${label}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL ${label}${detail !== undefined ? ` — ${detail}` : ""}`);
};

const load = (file: string): WorkbookFacts =>
  parseWorkbook(new Uint8Array(readFileSync(join(fixturesDir, file))));

const verifyCorpus = (): void => {
  for (const [file, expected] of Object.entries(EXPECTATIONS)) {
    console.log(`\n${file}`);
    const facts = load(file);
    check(`parses into ${expected.sheets} sheets`, facts.sheets.length === expected.sheets, `got ${facts.sheets.length}`);
    check(`${expected.formulas} formulas`, facts.totals.formulaCount === expected.formulas, `got ${facts.totals.formulaCount}`);
    check(`${expected.merges} merged ranges`, facts.totals.mergeCount === expected.merges, `got ${facts.totals.mergeCount}`);
    check(`>= ${expected.minValidations} validations`, facts.totals.validationCount >= expected.minValidations, `got ${facts.totals.validationCount}`);
    check(`vba detection = ${expected.vba}`, facts.hasVba === expected.vba, `got ${facts.hasVba}`);
    const chars = promptSize(compactWorkbook(facts));
    check(`compacted prompt <= ${PROMPT_CHAR_CAP} chars`, chars <= PROMPT_CHAR_CAP, `got ${chars}`);
  }
};

const verifyPurchaseOrder = (): void => {
  console.log(`\nscenario: purchase-order hardcoded-total discrepancy`);
  const facts = load("purchase-order.xlsx");
  const anomalies = detectAnomalies(facts);
  const f33 = anomalies.find((anomaly) => anomaly.ref === "F33");
  check("surfaces an anomaly at F33", f33 !== undefined);
  check("F33 anomaly is a hardcoded-total-constant", f33?.kind === "hardcoded-total-constant", f33?.kind);
  check("F33 anomaly captures the literal 31", f33?.literals.includes(31) === true, JSON.stringify(f33?.literals));
  check("F33 anomaly carries a machine-generated question", (f33?.question.length ?? 0) > 0);
  check("F33 anomaly names the unreferenced F32", f33?.message.includes("F32") === true, f33?.message);

  const taxSignals = detectTaxSignals(facts);
  const tax = taxSignals.find((signal) => Math.abs(signal.ratePercent - 3.8) < 0.001);
  check("extracts the 3.8% tax rule", tax !== undefined, JSON.stringify(taxSignals));
  check("tax rule is located at F31", tax?.ref === "F31", tax?.ref);
};

const verifyInventory = (): void => {
  console.log(`\nscenario: inventory reorder rule + conditional business-state`);
  const facts = load("inventory-management-tracker.xlsx");
  const formulas = facts.sheets.flatMap((sheet) => sheet.formulas);
  const reorder = formulas.find((formula) => /IF\([^)]*<[^)]*,\s*"REORDER"/i.test(formula.formula));
  check("extracts the reorder IF rule", reorder !== undefined, reorder?.formula);

  const cfRules = facts.sheets.flatMap((sheet) => sheet.conditionalFormats).flatMap((cf) => cf.rules);
  const businessState = cfRules.find(
    (rule) => rule.type === "expression" && rule.formula !== undefined && rule.formula.includes("<"),
  );
  check("summarises a conditional business-state rule", businessState !== undefined, `cfRules=${cfRules.length}`);
};

const verifyReservation = (): void => {
  console.log(`\nscenario: reservation validations + protection`);
  const facts = load("group-room-reservation-list.xlsx");
  const validations = facts.sheets.flatMap((sheet) => sheet.dataValidations);
  check("extracts 6 validation blocks", validations.length === 6, `got ${validations.length}`);

  const resolvedEnums = validations.filter((validation) => (validation.enumValues?.length ?? 0) > 0);
  check(">= 5 validations resolve to enum values", resolvedEnums.length >= 5, `got ${resolvedEnums.length}`);
  const gender = validations.find((validation) => validation.enumSource === "Gender");
  check("resolves the Gender named range to its values", gender?.enumValues?.includes("Male") === true, JSON.stringify(gender?.enumValues));

  const protectedSheets = facts.sheets.filter((sheet) => sheet.protection !== null);
  check("captures protection flags on both sheets", protectedSheets.length === 2, `got ${protectedSheets.length}`);

  const doesNotInventRooms = validations.every(
    (validation) => validation.type !== "list" || (validation.enumValues?.length ?? 0) > 0 || validation.formula1 !== undefined,
  );
  check("does not invent unsourced room lists", doesNotInventRooms);
};

console.log("extraction-ci: deterministic parse + compact + verify over fixtures/excel-samples");
verifyCorpus();
verifyPurchaseOrder();
verifyInventory();
verifyReservation();

console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failing assertion(s)`);
if (failures > 0) process.exit(1);
