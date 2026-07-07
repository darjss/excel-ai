import * as v from "valibot";
import { catalogSchema } from "./catalog";
import {
  findingRefsValid,
  isViableSkeleton,
  productCategoryRefsValid,
  ruleScopeRefsValid,
  uniformCurrency,
  uniqueFindingIds,
  uniqueProductIds,
  uniqueRuleIds,
} from "./integrity";
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

export const orderPortalConfigSchema = v.strictObject({
  ...sharedEntries,
  templateFamily: v.literal("order-portal"),
  catalog: catalogSchema,
  rules: v.array(ruleSchema),
  validations: v.array(validationSchema),
});

const familyVariant = v.variant("templateFamily", [orderPortalConfigSchema]);

export const portalConfigSchema = v.pipe(
  familyVariant,
  v.check(uniqueProductIds, "Product ids must be unique"),
  v.check(uniqueRuleIds, "Rule ids must be unique"),
  v.check(uniqueFindingIds, "Finding ids must be unique"),
  v.check(uniformCurrency, "All prices must share a single currency"),
  v.check(productCategoryRefsValid, "Every product.categoryId must reference a known category"),
  v.check(ruleScopeRefsValid, "Every rule scope must reference a known product or category"),
  v.check(findingRefsValid, "Every finding.targetRef must reference a known entity"),
  v.check(
    isViableSkeleton,
    "Config must contain at least one rule, or products with a non-low-confidence finding",
  ),
);
