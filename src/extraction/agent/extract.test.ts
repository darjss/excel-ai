import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { wholesaleConfig } from "@/portal-config";
import { buildDefaultStyle } from "../style";
import { runExtraction } from "./extract";
import type { ChatFn, ChatResult } from "./models";

const WORKBOOK = new Uint8Array(
  readFileSync(join("fixtures", "excel-samples", "purchase-order.xlsx")),
);

const draftReply = (draft: unknown): ChatResult => ({
  content: "",
  finishReason: "tool_calls",
  toolCalls: [
    {
      id: "call_1",
      type: "function",
      function: { name: "proposeDraft", arguments: JSON.stringify({ draft }) },
    },
  ],
});

const proposingChat = (draft: unknown): ChatFn => async () => draftReply(draft);

const stylePickJson = (sections: string[]): string =>
  JSON.stringify({
    paletteKey: "wholesale-navy",
    radius: "md",
    fontPairing: "inter-inter",
    copy: { heroLine: "Order ahead.", about: "A wholesale supplier.", orderCtaLabel: "Order now" },
    sections,
  });

const proposingWithStyle = (draft: unknown, sections: string[]): ChatFn => async (request) => {
  const system = request.messages.find((message) => message.role === "system")?.content ?? "";
  if (system.includes("brand designer")) {
    return { content: stylePickJson(sections), finishReason: "stop", toolCalls: [] };
  }
  return draftReply(draft);
};

describe("runExtraction pipeline (mocked model)", () => {
  it("returns a valid PortalConfig when the model proposes a clean draft", async () => {
    const events: string[] = [];
    const outcome = await runExtraction(WORKBOOK, {
      chat: proposingChat(wholesaleConfig),
      emit: (event) => events.push(event.phase),
    });
    expect(outcome.kind).toBe("ready");
    if (outcome.kind === "ready") expect(outcome.config.business.name).toBe("Northgate Provisions");
    expect(events).toContain("parse");
    expect(events).toContain("verify");
    expect(events.at(-1)).toBe("done");
  });

  it("downgrades a finding whose tax rule contradicts the source formula", async () => {
    const badTax = structuredClone(wholesaleConfig);
    const taxRule = badTax.rules.find((rule) => rule.id === "sales-tax");
    if (taxRule?.type === "tax") {
      taxRule.ratePercent = 8;
      taxRule.source = { ...taxRule.source, formula: "=E41*5%" };
    }

    const outcome = await runExtraction(WORKBOOK, { chat: proposingChat(badTax) });
    expect(outcome.kind).toBe("ready");
    if (outcome.kind !== "ready") return;
    const taxFinding = outcome.config.findings.find((finding) => finding.targetRef?.id === "sales-tax");
    expect(taxFinding?.confidence).toBe("low");
    expect(taxFinding?.question).toBeDefined();
    expect(outcome.report.downgrades.some((downgrade) => downgrade.ruleId === "sales-tax")).toBe(true);
  });

  it("falls back to the default style when the style pick omits a core section", async () => {
    const outcome = await runExtraction(WORKBOOK, {
      chat: proposingWithStyle(wholesaleConfig, ["about"]),
    });
    expect(outcome.kind).toBe("ready");
    if (outcome.kind !== "ready") return;
    expect(outcome.config.style).toEqual(buildDefaultStyle(outcome.config));
  });

  it("applies the style pick as-is when it includes all core sections plus extras", async () => {
    const sections = ["hero", "catalog", "order-form", "about", "contact"];
    const outcome = await runExtraction(WORKBOOK, {
      chat: proposingWithStyle(wholesaleConfig, sections),
    });
    expect(outcome.kind).toBe("ready");
    if (outcome.kind !== "ready") return;
    expect(outcome.config.style.sections).toEqual(sections);
  });

  it("routes to needs-human when the model never proposes a draft", async () => {
    const chat: ChatFn = async () => ({ content: "no tools here", finishReason: "stop", toolCalls: [] });
    const outcome = await runExtraction(WORKBOOK, { chat });
    expect(outcome.kind).toBe("needs-human");
    if (outcome.kind === "needs-human") expect(outcome.reason).toBe("no-draft");
  });

  const unpricedDraft = () => {
    const unpriced = structuredClone(wholesaleConfig);
    unpriced.catalog.tables = unpriced.catalog.tables.map((table) => ({
      ...table,
      products: table.products.map((product) => ({
        ...product,
        unitPrice: { ...product.unitPrice, amount: 0 },
      })),
    }));
    return unpriced;
  };

  it("drops into builder mode when the draft has no usable prices", async () => {
    const outcome = await runExtraction(WORKBOOK, { chat: proposingChat(unpricedDraft()) });
    expect(outcome.kind).toBe("builder-mode");
    if (outcome.kind === "builder-mode") expect(outcome.preview.length).toBeGreaterThan(0);
  });

  it("re-runs with supplier hints and escalates to needs-human when still unviable", async () => {
    const hints = {
      sheet: "PriceList",
      range: "A1:E40",
      columns: { product: "B", price: "E" },
    };
    const outcome = await runExtraction(WORKBOOK, { chat: proposingChat(unpricedDraft()) }, hints);
    expect(outcome.kind).toBe("needs-human");
    if (outcome.kind === "needs-human") expect(outcome.reason).toBe("unviable-after-hints");
  });

  it("produces a ready portal on a hinted re-run when the draft is viable", async () => {
    const hints = {
      sheet: "PriceList",
      range: "A1:E40",
      columns: { product: "B", price: "E" },
    };
    const outcome = await runExtraction(WORKBOOK, { chat: proposingChat(wholesaleConfig) }, hints);
    expect(outcome.kind).toBe("ready");
  });
});
