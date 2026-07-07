import * as v from "valibot";
import { confidenceBand, nonEmptyText } from "./primitives";

export const contactSchema = v.strictObject({
  email: v.optional(nonEmptyText),
  phone: v.optional(nonEmptyText),
  address: v.optional(nonEmptyText),
});

export const businessSchema = v.strictObject({
  name: nonEmptyText,
  description: v.optional(nonEmptyText),
  contact: contactSchema,
  paymentInstructions: nonEmptyText,
});

export const findingRefSchema = v.variant("kind", [
  v.strictObject({ kind: v.literal("rule"), id: nonEmptyText }),
  v.strictObject({ kind: v.literal("product"), id: nonEmptyText }),
  v.strictObject({ kind: v.literal("category"), id: nonEmptyText }),
]);

export const findingSchema = v.strictObject({
  id: nonEmptyText,
  targetRef: v.optional(findingRefSchema),
  confidence: confidenceBand,
  plainEnglish: nonEmptyText,
  question: v.optional(nonEmptyText),
  accepted: v.boolean(),
});

export const findingsSchema = v.pipe(v.array(findingSchema), v.minLength(1));

export type Business = v.InferOutput<typeof businessSchema>;
export type Finding = v.InferOutput<typeof findingSchema>;
export type FindingRef = v.InferOutput<typeof findingRefSchema>;
