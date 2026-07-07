import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";
import { createdAt, id, updatedAt } from "./columns";

export * from "./auth-schema";

export const portalDraft = sqliteTable(
  "portal_draft",
  {
    id: id(),
    jobId: text("job_id").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").unique(),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("portal_draft_user_idx").on(table.userId)],
);

export const supplierSubscription = sqliteTable(
  "supplier_subscription",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    planSlug: text("plan_slug").notNull(),
    status: text("status").notNull(),
    polarSubscriptionId: text("polar_subscription_id"),
    currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
);

export const project = sqliteTable(
  "project",
  {
    id: id(),
    name: text("name").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("project_owner_idx").on(table.ownerId)],
);

export const whiteGloveRequest = sqliteTable(
  "white_glove_request",
  {
    id: id(),
    email: text("email").notNull(),
    jobId: text("job_id").notNull(),
    reason: text("reason").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("white_glove_job_idx").on(table.jobId)],
);
