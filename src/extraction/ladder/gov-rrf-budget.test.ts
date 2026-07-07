import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ChatFn } from "../agent/models";
import { compactWorkbook } from "../compact/compact";
import { parseWorkbook } from "../parse/sheet-facts";
import { checkCaps } from "./caps";
import { classifySpecies } from "./classify";

const facts = () =>
  parseWorkbook(new Uint8Array(readFileSync(join("fixtures", "excel-samples", "gov-rrf-budget-template.xlsx"))));

const noModel: ChatFn = async () => {
  throw new Error("gov-rrf budget template should classify without the model");
};

describe("gov-rrf-budget-template.xlsx", () => {
  it("classifies as an order sheet deterministically", async () => {
    const parsed = facts();
    const verdict = await classifySpecies(parsed, compactWorkbook(parsed), { chat: noModel, model: "aux" });
    expect(verdict.verdict).toBe("order-sheet");
    expect(verdict.method).toBe("deterministic");
  });

  it("does not trip a needs-human cap (no too-large truncation)", () => {
    expect(checkCaps(facts())).toBeNull();
  });
});
