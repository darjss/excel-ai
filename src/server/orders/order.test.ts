import { describe, expect, it } from "vitest";
import { bakeryConfig } from "@/portal-config";
import { buildOrder, type SubmitOrderInput } from "./order";

const buyer = { name: "Sam Buyer", contact: "sam@example.com" };
const context = { id: "order-1", now: 1_700_000_000_000, source: "portal" as const };

const submit = (lines: SubmitOrderInput["lines"], token?: string | null): SubmitOrderInput => ({
  buyer,
  lines,
  buyerLinkToken: token ?? null,
});

describe("buildOrder", () => {
  it("snapshots buyer, prices, totals and payment instructions", () => {
    const order = buildOrder(bakeryConfig, submit([{ productId: "sourdough-classic", quantity: 4 }]), context);
    expect(order.id).toBe("order-1");
    expect(order.status).toBe("received");
    expect(order.source).toBe("portal");
    expect(order.buyer).toEqual(buyer);
    expect(order.lines[0]?.unitPrice).toEqual({ currencyCode: "USD", amount: 650 });
    expect(order.lines[0]?.lineTotal).toEqual({ currencyCode: "USD", amount: 2600 });
    expect(order.lines[0]?.available).toBe(true);
    expect(order.total).toEqual({ currencyCode: "USD", amount: 2600 });
    expect(order.paymentInstructions).toBe(bakeryConfig.business.paymentInstructions);
    expect(order.violations).toEqual([]);
  });

  it("captures order-minimum violations for a below-threshold order", () => {
    const order = buildOrder(bakeryConfig, submit([{ productId: "sourdough-classic", quantity: 1 }]), context);
    expect(order.total).toEqual({ currencyCode: "USD", amount: 650 });
    expect(order.violations).toEqual([{ ruleId: "min-order", message: bakeryConfig.rules[1]?.plainEnglish }]);
  });

  it("flags removed products without discarding the rest of the order", () => {
    const order = buildOrder(
      bakeryConfig,
      submit([
        { productId: "sourdough-classic", quantity: 4 },
        { productId: "discontinued-item", quantity: 2 },
      ]),
      context,
    );
    const removed = order.lines.find((l) => l.productId === "discontinued-item");
    const kept = order.lines.find((l) => l.productId === "sourdough-classic");
    expect(removed?.available).toBe(false);
    expect(removed?.lineTotal).toEqual({ currencyCode: "USD", amount: 0 });
    expect(kept?.available).toBe(true);
    expect(order.subtotal).toEqual({ currencyCode: "USD", amount: 2600 });
  });

  it("records submit-time prices — a later config price change does not alter a built order", () => {
    const input = submit([{ productId: "sourdough-classic", quantity: 4 }]);
    const before = buildOrder(bakeryConfig, input, context);

    const raised = structuredClone(bakeryConfig);
    const product = raised.catalog.tables[0]?.products[0];
    if (product) product.unitPrice = { currencyCode: "USD", amount: 900 };
    const after = buildOrder(raised, input, { ...context, id: "order-2" });

    expect(before.lines[0]?.unitPrice).toEqual({ currencyCode: "USD", amount: 650 });
    expect(before.total).toEqual({ currencyCode: "USD", amount: 2600 });
    expect(after.lines[0]?.unitPrice).toEqual({ currencyCode: "USD", amount: 900 });
    expect(after.total).toEqual({ currencyCode: "USD", amount: 3600 });
  });

  it("leaves attribution unset when no link context is supplied", () => {
    const order = buildOrder(bakeryConfig, submit([{ productId: "sourdough-classic", quantity: 4 }]), context);
    expect(order.buyerLinkToken).toBeUndefined();
    expect(order.buyerLinkName).toBeUndefined();
  });

  it("snapshots the link token and name when attribution context is supplied", () => {
    const order = buildOrder(
      bakeryConfig,
      submit([{ productId: "sourdough-classic", quantity: 4 }], "tok_123"),
      { ...context, attribution: { token: "tok_123", buyerName: "Cafe Rosa" } },
    );
    expect(order.buyerLinkToken).toBe("tok_123");
    expect(order.buyerLinkName).toBe("Cafe Rosa");
  });

  it("merges duplicate productIds so lines reconcile with the charged subtotal", () => {
    const order = buildOrder(
      bakeryConfig,
      submit([
        { productId: "sourdough-classic", quantity: 2 },
        { productId: "sourdough-classic", quantity: 3 },
      ]),
      context,
    );
    expect(order.lines).toHaveLength(1);
    expect(order.lines[0]?.quantity).toBe(5);
    const linesSum = order.lines.reduce((sum, line) => sum + line.lineTotal.amount, 0);
    expect(linesSum).toBe(order.subtotal.amount);
  });

  it("strips CR/LF from buyer name and contact", () => {
    const order = buildOrder(
      bakeryConfig,
      {
        buyer: { name: "Sam\r\nBcc: evil@x.com", contact: "sam@example.com\ninjected" },
        lines: [{ productId: "sourdough-classic", quantity: 4 }],
        buyerLinkToken: null,
      },
      context,
    );
    expect(order.buyer.name).toBe("Sam Bcc: evil@x.com");
    expect(order.buyer.contact).toBe("sam@example.com injected");
  });
});
