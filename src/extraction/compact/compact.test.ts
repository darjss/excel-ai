import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseWorkbook } from "../parse/sheet-facts";
import { compactWorkbook, renderPromptWithBudget } from "./compact";

const compact = compactWorkbook(
  parseWorkbook(new Uint8Array(readFileSync(join("fixtures", "excel-samples", "purchase-order.xlsx")))),
);

describe("renderPromptWithBudget", () => {
  it("renders full detail under a generous cap with no truncation", () => {
    const rendered = renderPromptWithBudget(compact, 1_000_000);
    expect(rendered.truncated).toBe(false);
    expect(rendered.text).toContain("Row:");
  });

  it("drops sample rows first and flags truncation under a tight cap", () => {
    const full = renderPromptWithBudget(compact, 1_000_000).text;
    const rendered = renderPromptWithBudget(compact, full.length - 1);
    expect(rendered.truncated).toBe(true);
    expect(rendered.text).toContain("Truncated to fit the prompt budget");
    expect(rendered.text).toContain("Formulas");
    expect(rendered.text).not.toContain("Row:");
  });
});
