import * as v from "valibot";
import { moneySchema, nonEmptyText, ruleScopeSchema, sourceRefSchema } from "./primitives";

const ruleBase = {
  id: nonEmptyText,
  source: sourceRefSchema,
  plainEnglish: nonEmptyText,
};

export const lineTotalRuleSchema = v.object({
  ...ruleBase,
  type: v.literal("line-total"),
  round: v.optional(v.picklist(["none", "nearest-cent"])),
});

export const orderMinimumRuleSchema = v.object({
  ...ruleBase,
  type: v.literal("order-minimum"),
  scope: ruleScopeSchema,
  basis: v.picklist(["subtotal", "quantity"]),
  threshold: v.pipe(v.number(), v.minValue(1)),
});

export const tierSchema = v.object({
  minQuantity: v.pipe(v.number(), v.integer(), v.minValue(1)),
  unitPrice: moneySchema,
});

export const tierPricingRuleSchema = v.object({
  ...ruleBase,
  type: v.literal("tier-pricing"),
  scope: ruleScopeSchema,
  tiers: v.pipe(v.array(tierSchema), v.minLength(1)),
});

export const taxRuleSchema = v.object({
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
export type TierPricingRule = v.InferOutput<typeof tierPricingRuleSchema>;
export type TaxRule = v.InferOutput<typeof taxRuleSchema>;
