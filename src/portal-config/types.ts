import type * as v from "valibot";
import type { orderPortalConfigSchema, portalConfigSchema } from "./schema/config";

export type PortalConfig = v.InferOutput<typeof portalConfigSchema>;
export type OrderPortalConfig = v.InferOutput<typeof orderPortalConfigSchema>;
export type TemplateFamily = PortalConfig["templateFamily"];
