import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";
import { createdAt, id, updatedAt } from "./columns";

export * from "./auth-schema";

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
