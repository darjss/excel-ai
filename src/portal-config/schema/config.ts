import * as v from "valibot";
import { catalogSchema } from "./catalog";
import { businessSchema, findingsSchema } from "./meta";
import { ruleSchema } from "./rules";
import { styleSchema } from "./style";
import { validationSchema } from "./validations";

const sharedEntries = {
  version: v.literal(1),
  business: businessSchema,
  style: styleSchema,
  findings: findingsSchema,
};

export const orderPortalConfigSchema = v.object({
  ...sharedEntries,
  templateFamily: v.literal("order-portal"),
  catalog: catalogSchema,
  rules: v.array(ruleSchema),
  validations: v.array(validationSchema),
});

const familyVariant = v.variant("templateFamily", [orderPortalConfigSchema]);

const productCount = (config: v.InferOutput<typeof familyVariant>) =>
  config.catalog.tables.reduce((total, table) => total + table.products.length, 0);

const hasConfidentFinding = (config: v.InferOutput<typeof familyVariant>) =>
  config.findings.some((finding) => finding.confidence !== "low");

export const portalConfigSchema = v.pipe(
  familyVariant,
  v.check((config) => productCount(config) > 0, "Catalog must contain at least one product"),
  v.check(hasConfidentFinding, "Extraction must produce at least one non-low-confidence finding"),
);
