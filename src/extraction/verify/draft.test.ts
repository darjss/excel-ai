import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Finding, PortalConfig, Rule } from "@/portal-config";
import { wholesaleConfig } from "@/portal-config";
import { parseWorkbook } from "../parse/sheet-facts";
import type { WorkbookFacts } from "../types";
import { verifyPortalConfig } from "./draft";

const SHEET = "Purchase Order";

const facts: WorkbookFacts = parseWorkbook(
  new Uint8Array(readFileSync(join("fixtures", "excel-samples", "purchase-order.xlsx"))),
);

const configWith = (rules: Rule[], findings: Finding[]): PortalConfig => ({
  ...wholesaleConfig,
  rules,
  findings,
});

const baseFinding: Finding = {
  id: "f-base",
  confidence: "high",
  plainEnglish: "A supplier price sheet was detected.",
  accepted: true,
};

const findingFor = (config: PortalConfig, ruleId: string): Finding | undefined =>
  config.findings.find(
    (finding) => finding.targetRef?.kind === "rule" && finding.targetRef.id === ruleId,
  );

describe("verifyPortalConfig — evidence-based recompute", () => {
  it("accepts a tax rule whose claimed rate matches the parsed formula", () => {
    const rule: Rule = {
      id: "tax-ok",
      type: "tax",
      plainEnglish: "3.8% tax on the subtotal.",
      source: { sheet: SHEET, range: "F31", formula: "=SUM(F30)*3.8%" },
      scope: { target: "all" },
      ratePercent: 3.8,
      inclusive: false,
    };
    const result = verifyPortalConfig(configWith([rule], [baseFinding]), facts);
    expect(result.report.downgrades).toHaveLength(0);
    expect(findingFor(result.config, "tax-ok")).toBeUndefined();
  });

  it("accepts a line-total rule backed by a quantity × price formula", () => {
    const rule: Rule = {
      id: "line-ok",
      type: "line-total",
      plainEnglish: "Line total is quantity times unit price.",
      source: { sheet: SHEET, range: "F21", formula: "=D21*E21" },
    };
    const result = verifyPortalConfig(configWith([rule], [baseFinding]), facts);
    expect(result.report.downgrades).toHaveLength(0);
  });

  it("downgrades a rule whose claimed range holds no parsed evidence, and synthesises a finding", () => {
    const rule: Rule = {
      id: "fabricated",
      type: "line-total",
      plainEnglish: "Line total lives in a range that does not exist.",
      source: { sheet: SHEET, range: "Z90:Z99", formula: "=Z90*Z91" },
    };
    const result = verifyPortalConfig(configWith([rule], [baseFinding]), facts);
    expect(result.report.downgrades.map((d) => d.ruleId)).toContain("fabricated");
    const synthesised = findingFor(result.config, "fabricated");
    expect(synthesised).toBeDefined();
    expect(synthesised?.confidence).toBe("low");
    expect(synthesised?.accepted).toBe(false);
    expect(synthesised?.question?.length ?? 0).toBeGreaterThan(0);
  });

  it("downgrades a JPY 999999999 order minimum absent from the sheet", () => {
    const rule: Rule = {
      id: "min-jpy",
      type: "order-minimum",
      plainEnglish: "Orders under ¥999,999,999 are rejected.",
      source: { sheet: SHEET, range: "F30", formula: "=F30" },
      scope: { target: "all" },
      basis: "subtotal",
      threshold: { currencyCode: "JPY", amount: 999999999 },
    };
    const result = verifyPortalConfig(configWith([rule], [baseFinding]), facts);
    expect(result.report.downgrades.map((d) => d.ruleId)).toContain("min-jpy");
    expect(findingFor(result.config, "min-jpy")?.confidence).toBe("low");
  });

  it("synthesises a finding for a 5%-vs-3.8% tax mismatch with no pre-linked finding", () => {
    const rule: Rule = {
      id: "tax-mismatch",
      type: "tax",
      plainEnglish: "Claims 5% tax.",
      source: { sheet: SHEET, range: "F31", formula: "=SUM(F30)*3.8%" },
      scope: { target: "all" },
      ratePercent: 5,
      inclusive: false,
    };
    const result = verifyPortalConfig(configWith([rule], [baseFinding]), facts);
    expect(result.report.downgrades.map((d) => d.ruleId)).toContain("tax-mismatch");
    const synthesised = findingFor(result.config, "tax-mismatch");
    expect(synthesised).toBeDefined();
    expect(synthesised?.confidence).toBe("low");
    expect(synthesised?.plainEnglish).toContain("3.8");
  });

  it("downgrades a pre-linked finding when the tax rate contradicts the parse", () => {
    const rule: Rule = {
      id: "tax-linked",
      type: "tax",
      plainEnglish: "Claims 5% tax.",
      source: { sheet: SHEET, range: "F31", formula: "=SUM(F30)*3.8%" },
      scope: { target: "all" },
      ratePercent: 5,
      inclusive: false,
    };
    const linked: Finding = {
      id: "f-tax-linked",
      targetRef: { kind: "rule", id: "tax-linked" },
      confidence: "high",
      plainEnglish: "A 5% tax line was found.",
      accepted: true,
    };
    const result = verifyPortalConfig(configWith([rule], [linked]), facts);
    const downgraded = findingFor(result.config, "tax-linked");
    expect(downgraded?.confidence).toBe("low");
    expect(downgraded?.accepted).toBe(false);
    expect(downgraded?.question?.length ?? 0).toBeGreaterThan(0);
    expect(result.config.findings.filter((f) => f.targetRef?.kind === "rule" && f.targetRef.id === "tax-linked")).toHaveLength(1);
  });

  it("keeps the F33 hard-coded-total anomaly surfaced as a finding (regression)", () => {
    const result = verifyPortalConfig(configWith([], [baseFinding]), facts);
    const f33 = result.config.findings.find((finding) => finding.plainEnglish.includes("F33"));
    expect(f33).toBeDefined();
    expect(f33?.confidence).toBe("low");
    expect(f33?.accepted).toBe(false);
  });
});
