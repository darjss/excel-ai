import type { Money, RuleScope } from "@/portal-config";
import type { Rule, TaxRule, TierPricingRule } from "@/portal-config";
import { selectTier } from "@/portal-config";

export interface CartLineInput {
  productId: string;
  name: string;
  unit?: string;
  categoryId?: string;
  unitPrice: Money;
  quantity: number;
}

export interface Cart {
  lines: readonly CartLineInput[];
}

export interface ComputedLine {
  productId: string;
  name: string;
  unit?: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  appliedRule?: string;
}

export interface Violation {
  ruleId: string;
  message: string;
}

export interface Totals {
  currencyCode: string;
  lines: ComputedLine[];
  subtotal: Money;
  tax?: Money;
  total: Money;
  violations: Violation[];
}

type OrderMinimumRule = Extract<Rule, { type: "order-minimum" }>;
type LineTotalRule = Extract<Rule, { type: "line-total" }>;

export interface TaxableLine {
  productId: string;
  categoryId?: string;
  lineTotal: Money;
}

export interface TaxOnBasis {
  display: number;
  added: number;
  applied: boolean;
}

interface RuleBuckets {
  tiers: TierPricingRule[];
  minimums: OrderMinimumRule[];
  lineTotal: LineTotalRule | undefined;
}

const unreachable = (value: never): never => {
  throw new Error(`Unhandled rule variant: ${JSON.stringify(value)}`);
};

const bucketRules = (rules: readonly Rule[]): RuleBuckets => {
  const buckets: RuleBuckets = { tiers: [], minimums: [], lineTotal: undefined };
  for (const rule of rules) {
    switch (rule.type) {
      case "tier-pricing":
        buckets.tiers.push(rule);
        break;
      case "order-minimum":
        buckets.minimums.push(rule);
        break;
      case "tax":
        break;
      case "line-total":
        buckets.lineTotal = rule;
        break;
      default:
        unreachable(rule);
    }
  }
  return buckets;
};

interface ScopeSubject {
  productId: string;
  categoryId?: string;
}

const scopeMatches = (scope: RuleScope, line: ScopeSubject): boolean => {
  switch (scope.target) {
    case "all":
      return true;
    case "category":
      return line.categoryId === scope.categoryId;
    case "product":
      return line.productId === scope.productId;
    default:
      return unreachable(scope);
  }
};

const scopeSpecificity = (scope: RuleScope): number => {
  switch (scope.target) {
    case "product":
      return 3;
    case "category":
      return 2;
    case "all":
      return 1;
    default:
      return unreachable(scope);
  }
};

const tierRuleFor = (
  tiers: readonly TierPricingRule[],
  line: CartLineInput,
): TierPricingRule | undefined => {
  let best: TierPricingRule | undefined;
  let bestSpecificity = 0;
  for (const rule of tiers) {
    if (!scopeMatches(rule.scope, line)) continue;
    const specificity = scopeSpecificity(rule.scope);
    if (specificity > bestSpecificity) {
      best = rule;
      bestSpecificity = specificity;
    }
  }
  return best;
};

const priceLine = (line: CartLineInput, tiers: readonly TierPricingRule[]): ComputedLine => {
  const tierRule = tierRuleFor(tiers, line);
  let unitPrice = line.unitPrice;
  let appliedRule: string | undefined;
  if (tierRule) {
    const tier = selectTier(tierRule.tiers, line.quantity);
    if (tier) {
      unitPrice = tier.unitPrice;
      appliedRule = tierRule.id;
    }
  }
  return {
    productId: line.productId,
    name: line.name,
    unit: line.unit,
    quantity: line.quantity,
    unitPrice,
    lineTotal: { currencyCode: unitPrice.currencyCode, amount: unitPrice.amount * line.quantity },
    appliedRule,
  };
};

const scopedSubtotal = (
  scope: RuleScope,
  cart: readonly CartLineInput[],
  computed: readonly ComputedLine[],
): number =>
  cart.reduce((sum, line, index) => {
    const lineTotal = computed[index]?.lineTotal.amount ?? 0;
    return scopeMatches(scope, line) ? sum + lineTotal : sum;
  }, 0);

const scopedQuantity = (scope: RuleScope, cart: readonly CartLineInput[]): number =>
  cart.reduce((sum, line) => (scopeMatches(scope, line) ? sum + line.quantity : sum), 0);

const scopedTaxBasis = (scope: RuleScope, lines: readonly TaxableLine[]): number =>
  lines.reduce((sum, line) => (scopeMatches(scope, line) ? sum + line.lineTotal.amount : sum), 0);

export const computeTaxOnBasis = (
  rules: readonly Rule[],
  lines: readonly TaxableLine[],
): TaxOnBasis => {
  const taxes = rules.filter((rule): rule is TaxRule => rule.type === "tax");
  let display = 0;
  let added = 0;
  for (const rule of taxes) {
    const base = scopedTaxBasis(rule.scope, lines);
    if (rule.inclusive) {
      display += Math.round((base * rule.ratePercent) / (100 + rule.ratePercent));
      continue;
    }
    const portion = Math.round((base * rule.ratePercent) / 100);
    display += portion;
    added += portion;
  }
  return { display, added, applied: taxes.length > 0 };
};

const violationFor = (
  rule: OrderMinimumRule,
  cart: readonly CartLineInput[],
  computed: readonly ComputedLine[],
): Violation | undefined => {
  if (rule.basis === "subtotal") {
    const base = scopedSubtotal(rule.scope, cart, computed);
    if (base < rule.threshold.amount) return { ruleId: rule.id, message: rule.plainEnglish };
    return undefined;
  }
  const quantity = scopedQuantity(rule.scope, cart);
  if (quantity < rule.threshold) return { ruleId: rule.id, message: rule.plainEnglish };
  return undefined;
};

const currencyOf = (cart: readonly CartLineInput[]): string =>
  cart[0]?.unitPrice.currencyCode ?? "USD";

export const computeTotals = (rules: readonly Rule[], cart: Cart): Totals => {
  const buckets = bucketRules(rules);
  const currencyCode = currencyOf(cart.lines);
  const lines = cart.lines.map((line) => priceLine(line, buckets.tiers));
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal.amount, 0);

  const taxable: TaxableLine[] = cart.lines.map((line, index) => ({
    productId: line.productId,
    categoryId: line.categoryId,
    lineTotal: lines[index]?.lineTotal ?? { currencyCode, amount: 0 },
  }));
  const tax = computeTaxOnBasis(rules, taxable);

  const violations: Violation[] = [];
  for (const rule of buckets.minimums) {
    const violation = violationFor(rule, cart.lines, lines);
    if (violation) violations.push(violation);
  }

  return {
    currencyCode,
    lines,
    subtotal: { currencyCode, amount: subtotal },
    tax: tax.applied ? { currencyCode, amount: tax.display } : undefined,
    total: { currencyCode, amount: subtotal + tax.added },
    violations,
  };
};
