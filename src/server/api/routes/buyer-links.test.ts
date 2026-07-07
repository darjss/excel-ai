import { Elysia } from "elysia";
import { describe, expect, it, vi } from "vitest";

const dbState = vi.hoisted(() => ({ rows: [] as { userId: string }[] }));
const authState = vi.hoisted(() => ({
  session: null as { user: { id: string; role?: string }; session: { id: string } } | null,
}));

vi.mock("@/server/db", () => {
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(dbState.rows),
  };
  return { db: { select: () => chain } };
});

vi.mock("@/server/lib/auth", () => ({
  auth: { api: { getSession: () => Promise.resolve(authState.session) } },
}));

vi.mock("@/server/portal/buyer-links", () => ({
  listSupplierBuyerLinks: () => Promise.resolve([]),
  createSupplierBuyerLink: () => Promise.resolve({ token: "t", buyerName: "b" }),
  revokeSupplierBuyerLink: () => Promise.resolve(true),
}));

vi.mock("@/server/portal/slugs", () => ({
  listUserPortalSlugs: () => Promise.resolve([]),
}));

import { errorPlugin } from "../errors";
import { buyerLinksRoute } from "./buyer-links";

const app = new Elysia({ aot: false }).use(errorPlugin).use(buyerLinksRoute);

const asUser = (id: string) => {
  authState.session = { user: { id }, session: { id: `${id}-session` } };
};

const request = (method: string, path: string, body?: unknown) =>
  app.handle(
    new Request(`http://localhost/buyer-links${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );

describe("buyer-links route ownership", () => {
  it("404s when user A lists buyer links on user B's slug", async () => {
    dbState.rows = [{ userId: "user-b" }];
    asUser("user-a");
    const response = await request("GET", "/rosewater");
    expect(response.status).toBe(404);
  });

  it("404s when user A creates a buyer link on user B's slug", async () => {
    dbState.rows = [{ userId: "user-b" }];
    asUser("user-a");
    const response = await request("POST", "/rosewater", { buyerName: "Cafe Rosa" });
    expect(response.status).toBe(404);
  });

  it("404s when user A revokes a buyer link on user B's slug", async () => {
    dbState.rows = [{ userId: "user-b" }];
    asUser("user-a");
    const response = await request("DELETE", "/rosewater/some-token");
    expect(response.status).toBe(404);
  });

  it("404s the same way when the slug does not exist", async () => {
    dbState.rows = [];
    asUser("user-a");
    const response = await request("GET", "/ghost");
    expect(response.status).toBe(404);
  });

  it("401s when the caller is unauthenticated", async () => {
    dbState.rows = [{ userId: "user-a" }];
    authState.session = null;
    const response = await request("GET", "/rosewater");
    expect(response.status).toBe(401);
  });

  it("allows the owner to list their own buyer links", async () => {
    dbState.rows = [{ userId: "user-a" }];
    asUser("user-a");
    const response = await request("GET", "/rosewater");
    expect(response.status).toBe(200);
  });
});
