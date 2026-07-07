import * as v from "valibot";
import { fieldRefSchema, nonEmptyText, sourceRefSchema } from "./primitives";

const validationBase = {
  id: nonEmptyText,
  field: fieldRefSchema,
  source: v.optional(sourceRefSchema),
};

export const requiredValidationSchema = v.strictObject({
  ...validationBase,
  kind: v.literal("required"),
});

export const enumValidationSchema = v.strictObject({
  ...validationBase,
  kind: v.literal("enum"),
  allowed: v.pipe(v.array(nonEmptyText), v.minLength(1)),
});

export const lengthValidationSchema = v.strictObject({
  ...validationBase,
  kind: v.literal("length"),
  min: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  max: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
});

export const validationSchema = v.variant("kind", [
  requiredValidationSchema,
  enumValidationSchema,
  lengthValidationSchema,
]);

export type Validation = v.InferOutput<typeof validationSchema>;
