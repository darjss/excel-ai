import type {
  Money,
  OrderMinimumRule,
  Rule,
  TaxRule,
  Tier,
  TierPricingRule,
} from "@/portal-config";
import type { WorkbookFacts } from "../types";
import { type RangeEvidence, collectRangeEvidence } from "./evidence";
import { percentLiterals, stripEquals } from "./formula";

export interface RuleDowngrade {
  ruleId: string;
  reason: string;
  question: string;
}

const NO_EVIDENCE_QUESTION =
  "We couldn't find anything in your sheet backing this rule — is it right?";

const PRODUCT_SHAPE =
  /(?:\$?[A-Z]{1,3}\$?\d+|\d+(?:\.\d+)?)\s*\*\s*(?:\$?[A-Z]{1,3}\$?\d+|\d+(?:\.\d+)?)/;

const matchesMoney = (money: Money, candidates: readonly number[]): boolean =>
  candidates.some(
    (value) =>
      Math.abs(Math.round(value * 100) - money.amount) < 1 ||
      Math.abs(value - money.amount) < 0.5,
  );

const matchesCount = (target: number, candidates: readonly number[]): boolean =>
  candidates.some((value) => Math.abs(value - target) < 0.5);

const downgrade = (ruleId: string, reason: string, question: string): RuleDowngrade => ({
  ruleId,
  reason,
  question,
});

const noEvidence = (rule: Rule): RuleDowngrade =>
  downgrade(
    rule.id,
    `The claimed source ${rule.source.sheet}!${rule.source.range} holds no formulas or values that back this rule.`,
    NO_EVIDENCE_QUESTION,
  );

const verifyLineTotal = (rule: Rule, evidence: RangeEvidence): RuleDowngrade | undefined => {
  const hasProduct = evidence.formulas.some((formula) =>
    PRODUCT_SHAPE.test(stripEquals(formula.formula)),
  );
  if (hasProduct) return undefined;
  return downgrade(
    rule.id,
    `No quantity × price formula was found in ${rule.source.sheet}!${rule.source.range} to back this line total.`,
    `We couldn't find a quantity × price calculation for ${rule.source.range} — is this line total right?`,
  );
};

const verifyTax = (rule: TaxRule, evidence: RangeEvidence): RuleDowngrade | undefined => {
  const rates = evidence.formulas.flatMap((formula) => percentLiterals(formula.formula));
  if (rates.length === 0) {
    return downgrade(
      rule.id,
      `No tax rate literal was found in ${rule.source.sheet}!${rule.source.range} to back the claimed ${rule.ratePercent}%.`,
      `We couldn't find a tax rate in ${rule.source.range} — is ${rule.ratePercent}% right?`,
    );
  }
  if (rates.some((rate) => Math.abs(rate - rule.ratePercent) < 0.001)) return undefined;
  return downgrade(
    rule.id,
    `Claimed tax rate ${rule.ratePercent}% does not match the ${rates.join(", ")}% found in ${rule.source.sheet}!${rule.source.range}.`,
    `The sheet shows ${rates[0]}% in ${rule.source.range} — is the tax rate ${rates[0]}% rather than ${rule.ratePercent}%?`,
  );
};

const verifyOrderMinimum = (
  rule: OrderMinimumRule,
  evidence: RangeEvidence,
): RuleDowngrade | undefined => {
  if (rule.basis === "subtotal") {
    if (matchesMoney(rule.threshold, evidence.numericValues)) return undefined;
    return downgrade(
      rule.id,
      `Order-minimum threshold ${rule.threshold.currencyCode} ${rule.threshold.amount} (minor units) is not present in ${rule.source.sheet}!${rule.source.range}.`,
      `We couldn't find the ${rule.threshold.currencyCode} order minimum in ${rule.source.range} — is it right?`,
    );
  }
  if (matchesCount(rule.threshold, evidence.numericValues)) return undefined;
  return downgrade(
    rule.id,
    `Order-minimum quantity threshold ${rule.threshold} is not present in ${rule.source.sheet}!${rule.source.range}.`,
    `We couldn't find the minimum quantity of ${rule.threshold} in ${rule.source.range} — is it right?`,
  );
};

const unverifiableTiers = (tiers: readonly Tier[], evidence: RangeEvidence): Tier[] =>
  tiers.filter((tier) => !matchesMoney(tier.unitPrice, evidence.numericValues));

const verifyTierPricing = (
  rule: TierPricingRule,
  evidence: RangeEvidence,
): RuleDowngrade | undefined => {
  const missing = unverifiableTiers(rule.tiers, evidence);
  if (missing.length === 0) return undefined;
  const prices = missing.map((tier) => tier.unitPrice.amount).join(", ");
  return downgrade(
    rule.id,
    `Tier unit prices ${prices} (minor units) are not present in ${rule.source.sheet}!${rule.source.range}.`,
    `We couldn't find every tier price in ${rule.source.range} — are these breaks right?`,
  );
};

export const verifyMoneyRule = (rule: Rule, facts: WorkbookFacts): RuleDowngrade | undefined => {
  const evidence = collectRangeEvidence(facts, rule.source.sheet, rule.source.range);
  if (!evidence.hasAny) return noEvidence(rule);
  switch (rule.type) {
    case "line-total":
      return verifyLineTotal(rule, evidence);
    case "tax":
      return verifyTax(rule, evidence);
    case "order-minimum":
      return verifyOrderMinimum(rule, evidence);
    case "tier-pricing":
      return verifyTierPricing(rule, evidence);
  }
};
