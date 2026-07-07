import { describe, expect, it } from "vitest";
import { compactWorkbook, parseWorkbook, promptSize } from "@/extraction";
import { templates } from "./templates";
import { buildTemplateWorkbook } from "./workbook";

const PROMPT_CHAR_CAP = 120_000;
const HEADER_LABELS = ["Product", "Unit", "Unit Price", "Quantity", "Line Total"];

describe("order-sheet templates extract cleanly", () => {
  for (const spec of templates) {
    describe(spec.slug, () => {
      const facts = parseWorkbook(buildTemplateWorkbook(spec));
      const sheet = facts.sheets[0];

      it("parses into a single non-VBA sheet", () => {
        expect(facts.sheets.length).toBe(1);
        expect(facts.hasVba).toBe(false);
        expect(sheet).toBeDefined();
      });

      it("carries a recognizable order-table header", () => {
        const headerValues = (sheet?.cells ?? [])
          .filter((cell) => cell.row === 7)
          .map((cell) => cell.value);
        for (const label of HEADER_LABELS) expect(headerValues).toContain(label);
      });

      it("has a line-total formula for every line item", () => {
        const lineTotals = (sheet?.formulas ?? []).filter((formula) =>
          /^C\d+\*D\d+$/.test(formula.formula),
        );
        expect(lineTotals.length).toBe(spec.lineItems.length);
      });

      it("has a subtotal SUM and an order total", () => {
        const formulas = (sheet?.formulas ?? []).map((formula) => formula.formula);
        expect(formulas.some((formula) => /^SUM\(E\d+:E\d+\)$/.test(formula))).toBe(true);
        const expectedFormulaCount = spec.lineItems.length + (spec.taxRatePercent === null ? 2 : 3);
        expect(facts.totals.formulaCount).toBe(expectedFormulaCount);
      });

      it("prices every line item as a number with a quantity", () => {
        const items = (sheet?.cells ?? []).filter(
          (cell) => cell.row >= 8 && cell.row < 8 + spec.lineItems.length,
        );
        const priceCells = items.filter((cell) => cell.col === 3);
        const quantityCells = items.filter((cell) => cell.col === 4);
        expect(priceCells.length).toBe(spec.lineItems.length);
        expect(quantityCells.length).toBe(spec.lineItems.length);
        for (const cell of priceCells) expect(typeof cell.value).toBe("number");
        for (const cell of quantityCells) expect(typeof cell.value).toBe("number");
      });

      it("compacts within the extraction prompt budget", () => {
        expect(promptSize(compactWorkbook(facts))).toBeLessThanOrEqual(PROMPT_CHAR_CAP);
      });
    });
  }
});

describe("subtotal SUM is arithmetically sound", () => {
  const spec = templates[0];
  if (!spec) throw new Error("expected at least one template");
  const facts = parseWorkbook(buildTemplateWorkbook(spec));
  const sheet = facts.sheets[0];
  const FIRST_ITEM_ROW = 8;

  it("sums exactly the item rows to the expected subtotal", () => {
    const subtotal = (sheet?.formulas ?? []).find((formula) =>
      /^SUM\(E\d+:E\d+\)$/.test(formula.formula),
    );
    expect(subtotal).toBeDefined();

    const range = subtotal?.formula.match(/^SUM\(E(\d+):E(\d+)\)$/);
    expect(range).not.toBeNull();
    const start = Number(range?.[1]);
    const end = Number(range?.[2]);
    expect(start).toBe(FIRST_ITEM_ROW);
    expect(end).toBe(FIRST_ITEM_ROW + spec.lineItems.length - 1);

    const expected = spec.lineItems.reduce(
      (sum, item) => sum + item.unitPrice * item.sampleQuantity,
      0,
    );
    expect(subtotal?.value).toBeCloseTo(expected, 6);
  });
});
