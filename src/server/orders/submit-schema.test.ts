import { Elysia } from "elysia";
import { describe, expect, it } from "vitest";
import { MAX_LINE_QUANTITY } from "@/lib/order-limits";
import { submitBodyT } from "./submit-schema";

const app = new Elysia({ aot: false }).post("/orders", () => ({ ok: true }), {
  body: submitBodyT,
});

const post = (body: unknown) =>
  app.handle(
    new Request("http://localhost/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

const validBody = {
  buyer: { name: "Sam", contact: "sam@example.com" },
  lines: [{ productId: "sourdough-classic", quantity: 4 }],
};

describe("submitBodyT", () => {
  it("accepts a valid submission", async () => {
    const response = await post(validBody);
    expect(response.status).toBe(200);
  });

  it("rejects quantity over the cap with 422", async () => {
    const response = await post({
      ...validBody,
      lines: [{ productId: "sourdough-classic", quantity: MAX_LINE_QUANTITY + 1 }],
    });
    expect(response.status).toBe(422);
  });

  it("rejects zero quantity with 422", async () => {
    const response = await post({
      ...validBody,
      lines: [{ productId: "sourdough-classic", quantity: 0 }],
    });
    expect(response.status).toBe(422);
  });
});
