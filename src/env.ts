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
    POLAR_PRODUCT_ID_STANDARD: v.optional(v.string()),
    POLAR_PRODUCT_ID_PRO: v.optional(v.string()),
    BILLING_DEV_BYPASS: v.optional(v.picklist(["true", "false"]), "false"),
    BILLING_DEV_BYPASS_PLAN: v.optional(v.picklist(["standard", "pro"]), "standard"),
    GOOGLE_CLIENT_ID: v.optional(v.string()),
    GOOGLE_CLIENT_SECRET: v.optional(v.string()),
    SSO_ENABLED: v.optional(v.picklist(["true", "false"]), "false"),
    AI_GATEWAY_ID: v.optional(v.string()),
    PORTAL_HOST_SUFFIX: v.optional(v.string()),
    PORTAL_SEED_ENABLED: v.optional(v.picklist(["true", "false"]), "false"),
    EXTRACTION_SEED_ENABLED: v.optional(v.picklist(["true", "false"]), "false"),
  },
  runtimeEnv: {
    BETTER_AUTH_SECRET: runtime.BETTER_AUTH_SECRET,
    APP_URL: runtime.APP_URL,
    POLAR_ACCESS_TOKEN: runtime.POLAR_ACCESS_TOKEN,
    POLAR_WEBHOOK_SECRET: runtime.POLAR_WEBHOOK_SECRET,
    POLAR_SERVER: runtime.POLAR_SERVER,
    POLAR_PRODUCT_ID_STANDARD: runtime.POLAR_PRODUCT_ID_STANDARD,
    POLAR_PRODUCT_ID_PRO: runtime.POLAR_PRODUCT_ID_PRO,
    BILLING_DEV_BYPASS: runtime.BILLING_DEV_BYPASS,
    BILLING_DEV_BYPASS_PLAN: runtime.BILLING_DEV_BYPASS_PLAN,
    GOOGLE_CLIENT_ID: runtime.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: runtime.GOOGLE_CLIENT_SECRET,
    SSO_ENABLED: runtime.SSO_ENABLED,
    AI_GATEWAY_ID: runtime.AI_GATEWAY_ID,
    PORTAL_HOST_SUFFIX: runtime.PORTAL_HOST_SUFFIX,
    PORTAL_SEED_ENABLED: runtime.PORTAL_SEED_ENABLED,
    EXTRACTION_SEED_ENABLED: runtime.EXTRACTION_SEED_ENABLED,
  },
  emptyStringAsUndefined: true,
});

export const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const ssoEnabled = env.SSO_ENABLED === "true";
