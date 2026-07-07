import { describe, expect, it } from "vitest";
import type { Order } from "@/server/orders/order";
import { AppError, ConflictError, NotFoundError } from "../errors";
import { resolveMutation } from "./order-mutation";

const money = { currencyCode: "USD", amount: 0 };

const order: Order = {
  id: "o1",
  status: "received",
  buyer: { name: "B", contact: "b@example.com" },
  lines: [],
  subtotal: money,
  total: money,
  paymentInstructions: "",
  violations: [],
  currencyCode: "USD",
  source: "manual",
  createdAt: 1,
  updatedAt: 1,
};

const thrown = (fn: () => unknown): unknown => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected resolveMutation to throw");
};

describe("resolveMutation", () => {
  it("returns the order on ok", () => {
    expect(resolveMutation({ kind: "ok", order })).toBe(order);
  });

  it("maps a terminal-order result to a 409 conflict", () => {
    const error = thrown(() => resolveMutation({ kind: "terminal-order" }));
    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).status).toBe(409);
  });

  it("maps an unknown-product result to a 422 carrying the offending ids", () => {
    const error = thrown(() => resolveMutation({ kind: "unknown-product", productIds: ["ghost"] }));
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).status).toBe(422);
    expect((error as AppError).details).toEqual({ productIds: ["ghost"] });
  });

  it("maps missing and unpublished results to 404 without an ownership oracle", () => {
    expect(() => resolveMutation({ kind: "not-found" })).toThrow(NotFoundError);
    expect(() => resolveMutation({ kind: "not-published" })).toThrow(NotFoundError);
  });
});
