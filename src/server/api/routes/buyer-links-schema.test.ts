import { Elysia, t } from "elysia";
import { describe, expect, it } from "vitest";

const createBody = t.Object({
  buyerName: t.String({ minLength: 1, maxLength: 200 }),
  contact: t.Optional(t.String({ maxLength: 200 })),
});

const app = new Elysia({ aot: false }).post("/buyer-links/:slug", () => ({ ok: true }), {
  body: createBody,
});

const post = (body: unknown) =>
  app.handle(
    new Request("http://localhost/buyer-links/cafe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("buyer link create schema", () => {
  it("accepts a named link with contact", async () => {
    const response = await post({ buyerName: "Cafe Rosa", contact: "orders@caferosa.example" });
    expect(response.status).toBe(200);
  });

  it("accepts a named link without contact", async () => {
    const response = await post({ buyerName: "Cafe Rosa" });
    expect(response.status).toBe(200);
  });

  it("rejects an empty buyer name with 422", async () => {
    const response = await post({ buyerName: "" });
    expect(response.status).toBe(422);
  });
});
