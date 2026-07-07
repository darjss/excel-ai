import type { Finding, PortalConfig, Rule, TaxRule } from "@/portal-config";
import type { WorkbookFacts } from "../types";
import { percentLiterals, stripEquals } from "./formula";
import { type FormulaAnomaly, detectAnomalies } from "./verifier";

export interface RuleDowngrade {
  ruleId: string;
  reason: string;
  question: string;
}

export interface VerifyReport {
  anomalies: FormulaAnomaly[];
  downgrades: RuleDowngrade[];
}

export interface VerifyResult {
  config: PortalConfig;
  report: VerifyReport;
}

const isTaxRule = (rule: Rule): rule is TaxRule => rule.type === "tax";

const verifyTaxRule = (rule: TaxRule): RuleDowngrade | undefined => {
  const formula = rule.source.formula;
  if (formula === undefined) return undefined;
  const rates = percentLiterals(formula);
  if (rates.length === 0) return undefined;
  if (rates.some((rate) => Math.abs(rate - rule.ratePercent) < 0.001)) return undefined;
  return {
    ruleId: rule.id,
    reason: `Claimed tax rate ${rule.ratePercent}% does not match the ${rates.join(", ")}% in ${stripEquals(formula)}.`,
    question: `The formula reads ${stripEquals(formula)} — is the tax rate ${rates[0]}% rather than ${rule.ratePercent}%?`,
  };
};

const rangeContainsRef = (range: string, ref: string): boolean => {
  const normalized = ref.toUpperCase();
  return range.toUpperCase().split(/[:\s]/).includes(normalized);
};

const anomalyForRule = (rule: Rule, anomalies: FormulaAnomaly[]): FormulaAnomaly | undefined =>
  anomalies.find(
    (anomaly) =>
      anomaly.sheet === rule.source.sheet && rangeContainsRef(rule.source.range, anomaly.ref),
  );

const downgradeFinding = (finding: Finding, question: string): Finding => ({
  ...finding,
  confidence: "low",
  accepted: false,
  question: finding.question ?? question,
});

export const verifyPortalConfig = (config: PortalConfig, facts: WorkbookFacts): VerifyResult => {
  const anomalies = detectAnomalies(facts);
  const downgrades: RuleDowngrade[] = [];

  for (const rule of config.rules) {
    if (isTaxRule(rule)) {
      const taxDowngrade = verifyTaxRule(rule);
      if (taxDowngrade !== undefined) downgrades.push(taxDowngrade);
    }
    const anomaly = anomalyForRule(rule, anomalies);
    if (anomaly !== undefined) {
      downgrades.push({ ruleId: rule.id, reason: anomaly.message, question: anomaly.question });
    }
  }

  const downgradedIds = new Set(downgrades.map((downgrade) => downgrade.ruleId));
  const questionByRule = new Map(downgrades.map((downgrade) => [downgrade.ruleId, downgrade.question]));

  const findings: Finding[] = config.findings.map((finding) => {
    const ref = finding.targetRef;
    if (ref?.kind === "rule" && downgradedIds.has(ref.id)) {
      return downgradeFinding(finding, questionByRule.get(ref.id) ?? "Please confirm this rule.");
    }
    return finding;
  });

  const coveredRefs = new Set(
    config.findings
      .map((finding) => finding.targetRef)
      .filter((ref): ref is { kind: "rule"; id: string } => ref?.kind === "rule")
      .map((ref) => ref.id),
  );

  const anomalyFindings: Finding[] = anomalies
    .filter((anomaly) => !anomalyCoveredByRule(anomaly, config.rules, coveredRefs))
    .map((anomaly) => ({
      id: `f-verify-${anomaly.sheet}-${anomaly.ref}`.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase(),
      confidence: "low",
      plainEnglish: anomaly.message,
      question: anomaly.question,
      accepted: false,
    }));

  return {
    config: { ...config, findings: [...findings, ...anomalyFindings] },
    report: { anomalies, downgrades },
  };
};

const anomalyCoveredByRule = (
  anomaly: FormulaAnomaly,
  rules: readonly Rule[],
  coveredRuleIds: Set<string>,
): boolean =>
  rules.some(
    (rule) =>
      coveredRuleIds.has(rule.id) &&
      rule.source.sheet === anomaly.sheet &&
      rangeContainsRef(rule.source.range, anomaly.ref),
  );
