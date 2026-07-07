import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { wholesaleConfig } from "@/portal-config";
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

describe("runExtraction pipeline (mocked model)", () => {
  it("returns a valid PortalConfig when the model proposes a clean draft", async () => {
    const events: string[] = [];
    const outcome = await runExtraction(WORKBOOK, {
      chat: proposingChat(wholesaleConfig),
      emit: (event) => events.push(event.phase),
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.config.business.name).toBe("Northgate Provisions");
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
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const taxFinding = outcome.config.findings.find((finding) => finding.targetRef?.id === "sales-tax");
    expect(taxFinding?.confidence).toBe("low");
    expect(taxFinding?.question).toBeDefined();
    expect(outcome.report.downgrades.some((downgrade) => downgrade.ruleId === "sales-tax")).toBe(true);
  });

  it("reports failure when the model never proposes a draft", async () => {
    const chat: ChatFn = async () => ({ content: "no tools here", finishReason: "stop", toolCalls: [] });
    const outcome = await runExtraction(WORKBOOK, { chat });
    expect(outcome.ok).toBe(false);
  });
});
