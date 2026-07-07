import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import type { ChatFn } from "../agent/models";
import { compactWorkbook } from "../compact/compact";
import { parseWorkbook } from "../parse/sheet-facts";
import { classifySpecies } from "./classify";

const load = (file: string) =>
  parseWorkbook(new Uint8Array(readFileSync(join("fixtures", "excel-samples", file))));

const throwingChat: ChatFn = async () => {
  throw new Error("classifier should not call the model for a confident signal");
};

const sayOrderSheet: ChatFn = async () => ({
  content: '{"isOrderSheet": true}',
  finishReason: "stop",
  toolCalls: [],
});

const ORDER_FIXTURES = [
  "purchase-order.xlsx",
  "sales-order-form.xlsx",
  "hubspot-order-form.xlsx",
  "exceldatapro-purchase-order.xlsx",
  "group-room-reservation-list.xlsx",
];

const PROSE = [
  "Personal Statement",
  "I am a dedicated professional with fifteen years of experience leading cross functional teams.",
  "Throughout my career I have consistently delivered strategic initiatives that improved outcomes.",
  "My background spans operations, communications, and long form editorial writing for magazines.",
  "I believe that thoughtful collaboration and clear narrative writing are the heart of good work.",
  "In my previous role I mentored junior colleagues and shaped the voice of the entire organisation.",
  "I write essays about culture, memory, and the slow craft of paying close attention to language.",
  "References and further examples of my published writing are available on request at any time.",
  "Thank you for taking the time to read this letter and considering my application seriously.",
  "I look forward to the opportunity of speaking with you and your colleagues very soon indeed.",
];

const essayWorkbook = (): ReturnType<typeof parseWorkbook> => {
  const sheet = XLSX.utils.aoa_to_sheet(PROSE.map((line) => [line]));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Letter");
  const bytes = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return parseWorkbook(new Uint8Array(bytes));
};

describe("classifySpecies", () => {
  for (const file of ORDER_FIXTURES) {
    it(`does not flag ${file} as wrong-species`, async () => {
      const facts = load(file);
      const verdict = await classifySpecies(facts, compactWorkbook(facts), {
        chat: sayOrderSheet,
        model: "aux",
      });
      expect(verdict.verdict).not.toBe("not-order-sheet");
    });
  }

  it("flags a prose-only essay as wrong-species without calling the model", async () => {
    const facts = essayWorkbook();
    const verdict = await classifySpecies(facts, compactWorkbook(facts), {
      chat: throwingChat,
      model: "aux",
    });
    expect(verdict.verdict).toBe("not-order-sheet");
    expect(verdict.method).toBe("deterministic");
  });

  it("classifies confident order fixtures deterministically", async () => {
    const facts = load("purchase-order.xlsx");
    const verdict = await classifySpecies(facts, compactWorkbook(facts), {
      chat: throwingChat,
      model: "aux",
    });
    expect(verdict.verdict).toBe("order-sheet");
    expect(verdict.method).toBe("deterministic");
  });
});
