import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/server/db";
import { portalDraft } from "@/server/db/schema";

export type PortalSlug = { slug: string };

export const listUserPortalSlugs = async (userId: string): Promise<PortalSlug[]> => {
  const rows = await db
    .select({ slug: portalDraft.slug })
    .from(portalDraft)
    .where(and(eq(portalDraft.userId, userId), isNotNull(portalDraft.slug)));
  return rows.flatMap((row) => (row.slug ? [{ slug: row.slug }] : []));
};
