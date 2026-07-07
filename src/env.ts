import { createEnv } from "@t3-oss/env-core";
import { env as runtime } from "cloudflare:workers";
import * as v from "valibot";

export const env = createEnv({
  server: {
    BETTER_AUTH_SECRET: v.pipe(v.string(), v.minLength(1)),
    APP_URL: v.pipe(v.string(), v.url()),
    POLAR_ACCESS_TOKEN: v.pipe(v.string(), v.minLength(1)),
    POLAR_WEBHOOK_SECRET: v.pipe(v.string(), v.minLength(1)),
    POLAR_SERVER: v.picklist(["sandbox", "production"]),
    POLAR_PRODUCT_ID_PRO: v.optional(v.string()),
    GOOGLE_CLIENT_ID: v.optional(v.string()),
    GOOGLE_CLIENT_SECRET: v.optional(v.string()),
    SSO_ENABLED: v.optional(v.picklist(["true", "false"]), "false"),
    AI_GATEWAY_ID: v.optional(v.string()),
    PORTAL_HOST_SUFFIX: v.optional(v.string()),
    PORTAL_SEED_ENABLED: v.optional(v.picklist(["true", "false"]), "false"),
    EXTRACTION_SEED_ENABLED: v.optional(v.picklist(["true", "false"]), "false"),
    MODEL_CALL_TIMEOUT_MS: v.pipe(
      v.optional(v.string(), "120000"),
      v.transform(Number),
      v.number(),
      v.integer(),
      v.minValue(1),
    ),
    EXTRACTION_WALL_CLOCK_BUDGET_MS: v.pipe(
      v.optional(v.string(), "600000"),
      v.transform(Number),
      v.number(),
      v.integer(),
      v.minValue(1),
    ),
  },
  runtimeEnv: {
    BETTER_AUTH_SECRET: runtime.BETTER_AUTH_SECRET,
    APP_URL: runtime.APP_URL,
    POLAR_ACCESS_TOKEN: runtime.POLAR_ACCESS_TOKEN,
    POLAR_WEBHOOK_SECRET: runtime.POLAR_WEBHOOK_SECRET,
    POLAR_SERVER: runtime.POLAR_SERVER,
    POLAR_PRODUCT_ID_PRO: runtime.POLAR_PRODUCT_ID_PRO,
    GOOGLE_CLIENT_ID: runtime.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: runtime.GOOGLE_CLIENT_SECRET,
    SSO_ENABLED: runtime.SSO_ENABLED,
    AI_GATEWAY_ID: runtime.AI_GATEWAY_ID,
    PORTAL_HOST_SUFFIX: runtime.PORTAL_HOST_SUFFIX,
    PORTAL_SEED_ENABLED: runtime.PORTAL_SEED_ENABLED,
    EXTRACTION_SEED_ENABLED: runtime.EXTRACTION_SEED_ENABLED,
    MODEL_CALL_TIMEOUT_MS: runtime.MODEL_CALL_TIMEOUT_MS,
    EXTRACTION_WALL_CLOCK_BUDGET_MS: runtime.EXTRACTION_WALL_CLOCK_BUDGET_MS,
  },
  emptyStringAsUndefined: true,
});

export const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const ssoEnabled = env.SSO_ENABLED === "true";
