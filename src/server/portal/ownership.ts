import { eq } from "drizzle-orm";
import { NotFoundError } from "@/server/api/errors";
import { db } from "@/server/db";
import { portalDraft } from "@/server/db/schema";

export const assertSlugOwnership = async (userId: string, slug: string): Promise<void> => {
  const [row] = await db
    .select({ userId: portalDraft.userId })
    .from(portalDraft)
    .where(eq(portalDraft.slug, slug))
    .limit(1);
  if (!row || row.userId !== userId) throw new NotFoundError("Portal not found");
};
