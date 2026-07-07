import * as v from "valibot";
import { moneySchema, nonEmptyText, sourceRefSchema } from "./primitives";

export const fieldType = v.picklist([
  "text",
  "number",
  "currency",
  "quantity",
  "category",
  "sku",
  "date",
  "boolean",
]);

export const productFieldSchema = v.strictObject({
  key: nonEmptyText,
  label: nonEmptyText,
  type: fieldType,
  source: v.optional(sourceRefSchema),
});

export const attributeSchema = v.strictObject({
  fieldKey: nonEmptyText,
  value: v.union([v.string(), v.number(), v.boolean()]),
});

export const productSchema = v.strictObject({
  id: nonEmptyText,
  name: nonEmptyText,
  categoryId: v.optional(nonEmptyText),
  sku: v.optional(nonEmptyText),
  unit: v.optional(nonEmptyText),
  unitPrice: moneySchema,
  attributes: v.array(attributeSchema),
  source: v.optional(sourceRefSchema),
});

export const categorySchema = v.strictObject({
  id: nonEmptyText,
  name: nonEmptyText,
});

export const catalogTableSchema = v.strictObject({
  id: nonEmptyText,
  name: nonEmptyText,
  fields: v.array(productFieldSchema),
  products: v.array(productSchema),
  source: v.optional(sourceRefSchema),
});

export const catalogSchema = v.strictObject({
  categories: v.array(categorySchema),
  tables: v.array(catalogTableSchema),
});

export type FieldType = v.InferOutput<typeof fieldType>;
export type Product = v.InferOutput<typeof productSchema>;
export type Catalog = v.InferOutput<typeof catalogSchema>;
