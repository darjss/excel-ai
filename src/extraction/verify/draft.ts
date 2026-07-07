import type { Finding, PortalConfig, Rule } from "@/portal-config";
import type { WorkbookFacts } from "../types";
import { type RuleDowngrade, verifyMoneyRule } from "./recompute";
import { type FormulaAnomaly, detectAnomalies } from "./verifier";

export type { RuleDowngrade } from "./recompute";

export interface VerifyReport {
  anomalies: FormulaAnomaly[];
  downgrades: RuleDowngrade[];
}

export interface VerifyResult {
  config: PortalConfig;
  report: VerifyReport;
}

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

const slug = (value: string): string => value.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();

const collectDowngrades = (config: PortalConfig, facts: WorkbookFacts, anomalies: FormulaAnomaly[]): RuleDowngrade[] => {
  const downgrades: RuleDowngrade[] = [];
  const seen = new Set<string>();
  const add = (downgrade: RuleDowngrade): void => {
    if (seen.has(downgrade.ruleId)) return;
    seen.add(downgrade.ruleId);
    downgrades.push(downgrade);
  };

  for (const rule of config.rules) {
    const recomputed = verifyMoneyRule(rule, facts);
    if (recomputed !== undefined) {
      add(recomputed);
      continue;
    }
    const anomaly = anomalyForRule(rule, anomalies);
    if (anomaly !== undefined) {
      add({ ruleId: rule.id, reason: anomaly.message, question: anomaly.question });
    }
  }
  return downgrades;
};

const ruleFindingIds = (findings: readonly Finding[]): Set<string> =>
  new Set(
    findings
      .map((finding) => finding.targetRef)
      .filter((ref): ref is { kind: "rule"; id: string } => ref?.kind === "rule")
      .map((ref) => ref.id),
  );

export const verifyPortalConfig = (config: PortalConfig, facts: WorkbookFacts): VerifyResult => {
  const anomalies = detectAnomalies(facts);
  const downgrades = collectDowngrades(config, facts, anomalies);

  const downgradedIds = new Set(downgrades.map((downgrade) => downgrade.ruleId));
  const questionByRule = new Map(downgrades.map((downgrade) => [downgrade.ruleId, downgrade.question]));
  const reasonByRule = new Map(downgrades.map((downgrade) => [downgrade.ruleId, downgrade.reason]));

  const findings: Finding[] = config.findings.map((finding) => {
    const ref = finding.targetRef;
    if (ref?.kind === "rule" && downgradedIds.has(ref.id)) {
      return downgradeFinding(finding, questionByRule.get(ref.id) ?? "Please confirm this rule.");
    }
    return finding;
  });

  const linkedRuleIds = ruleFindingIds(config.findings);
  const syntheticRuleFindings: Finding[] = downgrades
    .filter((downgrade) => !linkedRuleIds.has(downgrade.ruleId))
    .map((downgrade) => ({
      id: slug(`f-verify-rule-${downgrade.ruleId}`),
      targetRef: { kind: "rule", id: downgrade.ruleId },
      confidence: "low",
      plainEnglish: reasonByRule.get(downgrade.ruleId) ?? downgrade.reason,
      question: downgrade.question,
      accepted: false,
    }));

  const coveredRefs = new Set([...linkedRuleIds, ...downgradedIds]);
  const anomalyFindings: Finding[] = anomalies
    .filter((anomaly) => !anomalyCoveredByRule(anomaly, config.rules, coveredRefs))
    .map((anomaly) => ({
      id: slug(`f-verify-${anomaly.sheet}-${anomaly.ref}`),
      confidence: "low",
      plainEnglish: anomaly.message,
      question: anomaly.question,
      accepted: false,
    }));

  return {
    config: { ...config, findings: [...findings, ...syntheticRuleFindings, ...anomalyFindings] },
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
