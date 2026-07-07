import * as v from "valibot";

export const nonEmptyText = v.pipe(v.string(), v.trim(), v.minLength(1));

export const hexColor = v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/));

export const moneySchema = v.strictObject({
  currencyCode: v.pipe(v.string(), v.length(3), v.toUpperCase()),
  amount: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

export const sourceRefSchema = v.strictObject({
  sheet: nonEmptyText,
  range: nonEmptyText,
  formula: v.optional(nonEmptyText),
});

export const fieldRefSchema = v.strictObject({
  tableId: nonEmptyText,
  fieldKey: nonEmptyText,
});

export const ruleScopeSchema = v.variant("target", [
  v.strictObject({ target: v.literal("all") }),
  v.strictObject({ target: v.literal("category"), categoryId: nonEmptyText }),
  v.strictObject({ target: v.literal("product"), productId: nonEmptyText }),
]);

export const confidenceBand = v.picklist(["high", "medium", "low"]);

export type Money = v.InferOutput<typeof moneySchema>;
export type SourceRef = v.InferOutput<typeof sourceRefSchema>;
export type RuleScope = v.InferOutput<typeof ruleScopeSchema>;
export type ConfidenceBand = v.InferOutput<typeof confidenceBand>;
