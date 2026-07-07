import * as v from "valibot";
import { moneySchema, nonEmptyText, ruleScopeSchema, sourceRefSchema } from "./primitives";

const ruleBase = {
  id: nonEmptyText,
  source: sourceRefSchema,
  plainEnglish: nonEmptyText,
};

export const lineTotalRuleSchema = v.strictObject({
  ...ruleBase,
  type: v.literal("line-total"),
  round: v.optional(v.picklist(["none", "nearest-cent"])),
});

const orderMinimumBase = {
  ...ruleBase,
  type: v.literal("order-minimum"),
  scope: ruleScopeSchema,
};

export const orderMinimumRuleSchema = v.variant("basis", [
  v.strictObject({ ...orderMinimumBase, basis: v.literal("subtotal"), threshold: moneySchema }),
  v.strictObject({
    ...orderMinimumBase,
    basis: v.literal("quantity"),
    threshold: v.pipe(v.number(), v.integer(), v.minValue(1)),
  }),
]);

export const tierSchema = v.strictObject({
  minQuantity: v.pipe(v.number(), v.integer(), v.minValue(1)),
  unitPrice: moneySchema,
});

export type Tier = v.InferOutput<typeof tierSchema>;

const tiersStartAtLowest = (tiers: Tier[]): boolean => tiers[0]?.minQuantity === 1;

const tiersStrictlyAscending = (tiers: Tier[]): boolean =>
  tiers.every(
    (tier, index) => index === 0 || tier.minQuantity > (tiers[index - 1]?.minQuantity ?? 0),
  );

export const selectTier = (tiers: readonly Tier[], quantity: number): Tier | undefined => {
  let selected: Tier | undefined;
  for (const tier of tiers) {
    if (tier.minQuantity > quantity) break;
    selected = tier;
  }
  return selected;
};

export const tierPricingRuleSchema = v.strictObject({
  ...ruleBase,
  type: v.literal("tier-pricing"),
  scope: ruleScopeSchema,
  tiers: v.pipe(
    v.array(tierSchema),
    v.minLength(1),
    v.check(tiersStartAtLowest, "First tier must start at minQuantity 1"),
    v.check(
      tiersStrictlyAscending,
      "Tiers must be sorted ascending by minQuantity with unique values",
    ),
  ),
});

export const taxRuleSchema = v.strictObject({
  ...ruleBase,
  type: v.literal("tax"),
  scope: ruleScopeSchema,
  ratePercent: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
  inclusive: v.boolean(),
});

export const ruleSchema = v.variant("type", [
  lineTotalRuleSchema,
  orderMinimumRuleSchema,
  tierPricingRuleSchema,
  taxRuleSchema,
]);

export type Rule = v.InferOutput<typeof ruleSchema>;
export type OrderMinimumRule = v.InferOutput<typeof orderMinimumRuleSchema>;
export type TierPricingRule = v.InferOutput<typeof tierPricingRuleSchema>;
export type TaxRule = v.InferOutput<typeof taxRuleSchema>;
