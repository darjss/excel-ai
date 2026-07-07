import { Elysia, t } from "elysia";
import { env } from "@/env";
import { portalConfigFixtures } from "@/portal-config";
import { publishPortalConfig } from "@/server/portal/store";
import { ConflictError, NotFoundError } from "../errors";

export const portalRoute = new Elysia().post(
  "/portal/seed",
  async () => {
    if (env.PORTAL_SEED_ENABLED !== "true") {
      throw new NotFoundError("Portal seed endpoint is disabled");
    }

    const seeded: string[] = [];
    for (const [slug, config] of Object.entries(portalConfigFixtures)) {
      const result = await publishPortalConfig(slug, config);
      if (!result.ok) {
        throw new ConflictError(`Fixture ${slug} failed validation: ${result.error.message}`);
      }
      seeded.push(slug);
    }
    return { seeded };
  },
  {
    response: t.Object({
      seeded: t.Array(t.String()),
    }),
  },
);
