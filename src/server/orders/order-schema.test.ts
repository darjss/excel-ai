import { Elysia } from "elysia";
import { describe, expect, it } from "vitest";
import { errorPlugin } from "@/server/api/errors";
import {
  editLinesBodyT,
  listOrdersQueryT,
  manualOrderBodyT,
  updateStatusBodyT,
} from "./order-schema";

const app = new Elysia()
  .use(errorPlugin)
  .post("/manual", ({ body }) => body, { body: manualOrderBodyT })
  .patch("/status", ({ body }) => body, { body: updateStatusBodyT })
  .put("/lines", ({ body }) => body, { body: editLinesBodyT })
  .get("/list", ({ query }) => query, { query: listOrdersQueryT });

const send = (path: string, method: "POST" | "PATCH" | "PUT", body: unknown) => {
  const init: RequestInit = { method, headers: { "content-type": "application/json" } };
  init.body = JSON.stringify(body);
  return app.handle(new Request(`http://localhost${path}`, init));
};

const post = (path: string, body: unknown, method: "POST" | "PATCH" | "PUT" = "POST") =>
  send(path, method, body);

describe("order API schemas (app.handle)", () => {
  it("accepts a well-formed manual order", async () => {
    const res = await post("/manual", {
      buyer: { name: "Phone Buyer", contact: "+1 555 0000" },
      lines: [{ productId: "rye-loaf", quantity: 2 }],
    });
    expect(res.status).toBe(200);
  });

  it("rejects a manual order with an empty buyer name", async () => {
    const res = await post("/manual", {
      buyer: { name: "", contact: "x" },
      lines: [{ productId: "rye-loaf", quantity: 2 }],
    });
    expect(res.status).toBe(422);
  });

  it("rejects a manual order with no lines", async () => {
    const res = await post("/manual", {
      buyer: { name: "A", contact: "x" },
      lines: [],
    });
    expect(res.status).toBe(422);
  });

  it("accepts a valid status and rejects an unknown one", async () => {
    expect((await post("/status", { status: "confirmed" }, "PATCH")).status).toBe(200);
    expect((await post("/status", { status: "shipped" }, "PATCH")).status).toBe(422);
  });

  it("rejects a zero or fractional quantity on a line edit", async () => {
    expect((await post("/lines", { lines: [{ productId: "a", quantity: 0 }] }, "PUT")).status).toBe(422);
    expect((await post("/lines", { lines: [{ productId: "a", quantity: 1.5 }] }, "PUT")).status).toBe(422);
    expect((await post("/lines", { lines: [{ productId: "a", quantity: 2 }] }, "PUT")).status).toBe(200);
  });

  it("caps the list take at 50", async () => {
    expect((await app.handle(new Request("http://localhost/list?take=51"))).status).toBe(422);
    expect((await app.handle(new Request("http://localhost/list?take=25&cursor=1000:o1"))).status).toBe(200);
  });

  it("rejects a malformed pagination cursor", async () => {
    expect((await app.handle(new Request("http://localhost/list?cursor=not-a-cursor"))).status).toBe(422);
    expect((await app.handle(new Request("http://localhost/list?cursor=1000%3A"))).status).toBe(422);
    expect((await app.handle(new Request("http://localhost/list?cursor=1000%3Ao1"))).status).toBe(200);
  });
});
