import { describe, expect, it } from "vitest";
import { wholesaleConfig } from "@/portal-config";
import { groupFindings, summarizeFindings } from "./summary";

describe("summarizeFindings", () => {
  it("counts confirmed findings and open questions", () => {
    const summary = summarizeFindings(wholesaleConfig.findings);
    expect(summary.confirmed).toBe(2);
    expect(summary.questions).toBe(1);
  });

  it("stops counting a question once it is accepted", () => {
    const answered = wholesaleConfig.findings.map((finding) =>
      finding.id === "f-tax" ? { ...finding, accepted: true } : finding,
    );
    const summary = summarizeFindings(answered);
    expect(summary.confirmed).toBe(3);
    expect(summary.questions).toBe(0);
  });

  it("stops counting a question once it is explicitly rejected", () => {
    const summary = summarizeFindings(wholesaleConfig.findings, new Set(["f-tax"]));
    expect(summary.confirmed).toBe(2);
    expect(summary.questions).toBe(0);
  });

  it("keeps counting a never-decided question as open", () => {
    const summary = summarizeFindings(wholesaleConfig.findings, new Set(["f-pricelist"]));
    expect(summary.questions).toBe(1);
  });
});

describe("groupFindings", () => {
  it("groups findings by target kind in a stable order", () => {
    const groups = groupFindings(wholesaleConfig);
    expect(groups.map((group) => group.kind)).toEqual(["rule", "general"]);
    const ruleGroup = groups.find((group) => group.kind === "rule");
    expect(ruleGroup?.findings.map((finding) => finding.id)).toEqual(["f-tier-flour", "f-tax"]);
  });
});
