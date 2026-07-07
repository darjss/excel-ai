import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseWorkbook } from "../parse/sheet-facts";
import {
  numericLiteralOperands,
  percentLiterals,
  splitTopLevelAdditive,
} from "./formula";
import { detectAnomalies, detectTaxSignals } from "./verifier";

const fixture = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(join("fixtures", "excel-samples", name)));

describe("formula helpers", () => {
  it("splits additive operands at the top level only", () => {
    expect(splitTopLevelAdditive("=F30+F31+31")).toEqual(["F30", "F31", "31"]);
    expect(splitTopLevelAdditive("=SUM(F21:F29)")).toEqual(["SUM(F21:F29)"]);
  });

  it("extracts bare numeric operands and percent literals", () => {
    expect(numericLiteralOperands("F30+F31+31")).toEqual([31]);
    expect(percentLiterals("SUM(F30)*3.8%")).toEqual([3.8]);
  });
});

describe("detectAnomalies on the purchase-order fixture", () => {
  const facts = parseWorkbook(fixture("purchase-order.xlsx"));
  const anomalies = detectAnomalies(facts);

  it("surfaces the hard-coded total constant at F33", () => {
    const f33 = anomalies.find((anomaly) => anomaly.ref === "F33");
    expect(f33).toBeDefined();
    expect(f33?.kind).toBe("hardcoded-total-constant");
    expect(f33?.literals).toContain(31);
  });

  it("names the unreferenced shipping cell in its question", () => {
    const f33 = anomalies.find((anomaly) => anomaly.ref === "F33");
    expect(f33?.message).toContain("F32");
    expect(f33?.question.length ?? 0).toBeGreaterThan(0);
  });
});

describe("detectTaxSignals", () => {
  it("extracts the 3.8% tax rule from the purchase order", () => {
    const signals = detectTaxSignals(parseWorkbook(fixture("purchase-order.xlsx")));
    const tax = signals.find((signal) => Math.abs(signal.ratePercent - 3.8) < 0.001);
    expect(tax?.ref).toBe("F31");
  });
});
