import { getAgentByName } from "agents";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { deriveEffectiveConfig } from "@/review/effective-config";
import { isValidSlug } from "@/review/slug";
import { summarizeFindings } from "@/review/summary";
import type { ExtractionAgent, ExtractionState } from "@/server/agents/extraction";
import { db } from "@/server/db";
import { portalDraft } from "@/server/db/schema";
import { purgePortalCache, portalUrlFor } from "@/server/portal/cache";
import { publishPortalConfig } from "@/server/portal/store";
import { AppError, ConflictError, ForbiddenError, NotFoundError } from "../errors";
import { authPlugin } from "../plugins/auth";

const getAgent = (jobId: string) =>
  getAgentByName<Cloudflare.Env, ExtractionAgent>(env.EXTRACTION, jobId);

const findDraft = async (jobId: string) => {
  const [row] = await db.select().from(portalDraft).where(eq(portalDraft.jobId, jobId));
  return row ?? null;
};

const requireOwnedDraft = async (jobId: string, userId: string) => {
  const [row] = await db
    .select()
    .from(portalDraft)
    .where(and(eq(portalDraft.jobId, jobId), eq(portalDraft.userId, userId)));
  if (!row) throw new ForbiddenError("You have not claimed this draft.");
  return row;
};

const draftView = (snapshot: ExtractionState, slug: string | null) => {
  if (snapshot.config === null) throw new NotFoundError("This draft has no extracted config yet.");
  const answered = new Set(snapshot.answeredFindingIds);
  return {
    status: snapshot.status,
    published: snapshot.published,
    slug,
    config: deriveEffectiveConfig(snapshot.config),
    findings: snapshot.config.findings,
    answeredFindingIds: snapshot.answeredFindingIds,
    summary: summarizeFindings(snapshot.config.findings, answered),
  };
};

export const reviewRoute = new Elysia({ prefix: "/review" })
  .use(authPlugin)
  .get(
    "/slug-available",
    async ({ query }) => {
      const slug = query.slug.trim().toLowerCase();
      if (!isValidSlug(slug)) return { slug, valid: false, available: false };
      const [taken] = await db.select().from(portalDraft).where(eq(portalDraft.slug, slug));
      return { slug, valid: true, available: taken === undefined };
    },
    { requireAuth: true, query: t.Object({ slug: t.String() }) },
  )
  .post(
    "/:jobId/claim",
    async ({ user, params }) => {
      const agent = await getAgent(params.jobId);
      const snapshot: ExtractionState = await agent.snapshot();
      if (snapshot.status !== "done") {
        throw new ConflictError("Extraction is not finished, so it cannot be claimed yet.");
      }

      const existing = await findDraft(params.jobId);
      if (existing) {
        if (existing.userId !== user.id) {
          throw new ForbiddenError("This draft has already been claimed by another account.");
        }
        return { jobId: params.jobId, claimed: true };
      }

      try {
        await db.insert(portalDraft).values({ jobId: params.jobId, userId: user.id });
      } catch {
        const row = await findDraft(params.jobId);
        if (!row || row.userId !== user.id) {
          throw new ForbiddenError("This draft has already been claimed by another account.");
        }
      }
      return { jobId: params.jobId, claimed: true };
    },
    { requireAuth: true },
  )
  .get(
    "/:jobId/draft",
    async ({ user, params }) => {
      const draft = await requireOwnedDraft(params.jobId, user.id);
      const agent = await getAgent(params.jobId);
      const snapshot: ExtractionState = await agent.snapshot();
      return draftView(snapshot, draft.slug);
    },
    { requireAuth: true },
  )
  .post(
    "/:jobId/finding",
    async ({ user, params, body }) => {
      const draft = await requireOwnedDraft(params.jobId, user.id);
      const agent = await getAgent(params.jobId);
      const result = await agent.applyReview({
        type: "finding-decision",
        findingId: body.findingId,
        accepted: body.accepted,
      });
      if (!result.ok) {
        if (result.reason === "unknown_finding") throw new NotFoundError("Unknown finding.");
        throw new ConflictError("This draft is not ready for review.");
      }
      const snapshot: ExtractionState = await agent.snapshot();
      return draftView(snapshot, draft.slug);
    },
    {
      requireAuth: true,
      body: t.Object({ findingId: t.String({ minLength: 1 }), accepted: t.Boolean() }),
    },
  )
  .post(
    "/:jobId/business",
    async ({ user, params, body }) => {
      const draft = await requireOwnedDraft(params.jobId, user.id);
      const agent = await getAgent(params.jobId);
      const result = await agent.applyReview({ type: "edit-business-name", name: body.name });
      if (!result.ok) throw new ConflictError("This draft is not ready for review.");
      const snapshot: ExtractionState = await agent.snapshot();
      return draftView(snapshot, draft.slug);
    },
    {
      requireAuth: true,
      body: t.Object({ name: t.String({ minLength: 1, maxLength: 120 }) }),
    },
  )
  .post(
    "/:jobId/publish",
    async ({ user, params, body }) => {
      const owned = await requireOwnedDraft(params.jobId, user.id);
      if (owned.slug !== null) {
        throw new ConflictError("This portal is already published; renaming a slug is not supported yet.");
      }

      const slug = body.slug.trim().toLowerCase();
      if (!isValidSlug(slug)) {
        throw new AppError("validation", "That subdomain is not a valid slug.");
      }

      const agent = await getAgent(params.jobId);
      const snapshot: ExtractionState = await agent.snapshot();
      if (snapshot.config === null) throw new NotFoundError("This draft has no extracted config.");

      const openQuestions = summarizeFindings(
        snapshot.config.findings,
        new Set(snapshot.answeredFindingIds),
      ).questions;
      if (openQuestions > 0) {
        throw new AppError("validation", "Answer every open question before publishing.", {
          openQuestions,
        });
      }

      const effective = deriveEffectiveConfig(snapshot.config);

      const ownerScope = and(
        eq(portalDraft.jobId, params.jobId),
        eq(portalDraft.userId, user.id),
      );
      const releaseSlug = () => db.update(portalDraft).set({ slug: null }).where(ownerScope);

      try {
        await db.update(portalDraft).set({ slug }).where(ownerScope);
      } catch {
        throw new ConflictError("That subdomain is already taken.");
      }

      let published: Awaited<ReturnType<typeof publishPortalConfig>>;
      try {
        published = await publishPortalConfig(slug, effective);
      } catch (error) {
        await releaseSlug();
        throw error;
      }
      if (!published.ok) {
        await releaseSlug();
        throw new AppError("validation", published.error.message, published.error.details);
      }

      await db.update(portalDraft).set({ publishedAt: new Date() }).where(ownerScope);
      await agent.markPublished(slug);
      await purgePortalCache(slug);

      return { slug, portalUrl: portalUrlFor(slug) };
    },
    { requireAuth: true, body: t.Object({ slug: t.String({ minLength: 1 }) }) },
  );
