import { describe, expect, it, vi } from "vitest";

const dbState = vi.hoisted(() => ({ rows: [] as { userId: string }[] }));

vi.mock("@/server/db", () => {
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(dbState.rows),
  };
  return { db: { select: () => chain } };
});

import { NotFoundError } from "@/server/api/errors";
import { assertSlugOwnership } from "@/server/portal/ownership";

describe("assertSlugOwnership", () => {
  it("resolves when the slug belongs to the caller", async () => {
    dbState.rows = [{ userId: "user-a" }];
    await expect(assertSlugOwnership("user-a", "rosewater")).resolves.toBeUndefined();
  });

  it("404s when another user owns the slug, giving no ownership oracle", async () => {
    dbState.rows = [{ userId: "user-a" }];
    await expect(assertSlugOwnership("user-b", "rosewater")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("404s with the same error when the slug does not exist", async () => {
    dbState.rows = [];
    await expect(assertSlugOwnership("user-a", "ghost")).rejects.toBeInstanceOf(NotFoundError);
  });
});
