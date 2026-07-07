import { describe, expect, it } from "vitest";
import type { Order } from "./order";
import { isValidCursor, MAX_ORDERS_PAGE_SIZE, paginateOrders } from "./pagination";

const money = { currencyCode: "USD", amount: 0 };

const makeOrder = (id: string, createdAt: number): Order => ({
  id,
  status: "received",
  buyer: { name: "B", contact: "b@example.com" },
  lines: [],
  subtotal: money,
  total: money,
  paymentInstructions: "",
  violations: [],
  currencyCode: "USD",
  source: "portal",
  createdAt,
  updatedAt: createdAt,
});

const orders = Array.from({ length: 120 }, (_, i) => makeOrder(`o${i}`, 1_000 + i));

describe("paginateOrders", () => {
  it("returns newest first", () => {
    const page = paginateOrders(orders, { take: 3 });
    expect(page.orders.map((o) => o.id)).toEqual(["o119", "o118", "o117"]);
  });

  it("caps the page size at 50 even when a larger take is requested", () => {
    const page = paginateOrders(orders, { take: 200 });
    expect(page.orders).toHaveLength(MAX_ORDERS_PAGE_SIZE);
  });

  it("walks the full set via the cursor without gaps or repeats", () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    for (let guard = 0; guard < 10; guard += 1) {
      const page: ReturnType<typeof paginateOrders> = paginateOrders(orders, { take: 25, cursor });
      seen.push(...page.orders.map((o) => o.id));
      cursor = page.nextCursor;
      if (!cursor) break;
    }
    expect(cursor).toBeNull();
    expect(new Set(seen).size).toBe(orders.length);
    expect(seen[0]).toBe("o119");
  });

  it("stays stable when two orders share a createdAt", () => {
    const tied = [makeOrder("a", 5), makeOrder("b", 5), makeOrder("c", 5)];
    const first = paginateOrders(tied, { take: 2 });
    const second = paginateOrders(tied, { take: 2, cursor: first.nextCursor });
    const ids = [...first.orders, ...second.orders].map((o) => o.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("reports no next cursor on the final page", () => {
    const page = paginateOrders(orders.slice(0, 10), { take: 25 });
    expect(page.nextCursor).toBeNull();
  });
});

describe("isValidCursor", () => {
  it("accepts a well-formed createdAt:id cursor", () => {
    expect(isValidCursor("1700000000000:o1")).toBe(true);
    expect(isValidCursor("0:a")).toBe(true);
  });

  it("rejects malformed cursors", () => {
    expect(isValidCursor("")).toBe(false);
    expect(isValidCursor("abc")).toBe(false);
    expect(isValidCursor("1000")).toBe(false);
    expect(isValidCursor("1000:")).toBe(false);
    expect(isValidCursor(":o1")).toBe(false);
    expect(isValidCursor("12ab:o1")).toBe(false);
  });
});
