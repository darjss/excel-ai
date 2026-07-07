import * as v from "valibot";
import { confidenceBand, nonEmptyText } from "./primitives";

export const contactSchema = v.object({
  email: v.optional(nonEmptyText),
  phone: v.optional(nonEmptyText),
  address: v.optional(nonEmptyText),
});

export const businessSchema = v.object({
  name: nonEmptyText,
  description: v.optional(nonEmptyText),
  contact: contactSchema,
  paymentInstructions: nonEmptyText,
});

export const findingSchema = v.object({
  id: nonEmptyText,
  targetRef: v.optional(nonEmptyText),
  confidence: confidenceBand,
  plainEnglish: nonEmptyText,
  question: v.optional(nonEmptyText),
  accepted: v.boolean(),
});

export const findingsSchema = v.pipe(v.array(findingSchema), v.minLength(1));

export type Business = v.InferOutput<typeof businessSchema>;
export type Finding = v.InferOutput<typeof findingSchema>;
