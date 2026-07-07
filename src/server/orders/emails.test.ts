import { describe, expect, it, vi } from "vitest";
import { bakeryConfig } from "@/portal-config";
import {
  buyerConfirmationEmail,
  sendOrderEmails,
  supplierNotificationEmail,
} from "./emails";
import { buildOrder } from "./order";

const order = buildOrder(
  bakeryConfig,
  {
    buyer: { name: "Happy Buyer", contact: "happy@example.com" },
    lines: [{ productId: "sourdough-classic", quantity: 4 }],
    buyerLinkToken: null,
  },
  { id: "order-abc", now: 1_700_000_000_000, source: "portal" },
);

describe("order emails", () => {
  it("builds a buyer confirmation with order id, lines, totals and payment instructions", () => {
    const email = buyerConfirmationEmail(order, bakeryConfig.business);
    expect(email.subject).toContain("order-abc");
    expect(email.text).toContain("Classic Sourdough x4");
    expect(email.text).toContain("Total: USD 26.00");
    expect(email.text).toContain(bakeryConfig.business.paymentInstructions);
  });

  it("builds a supplier notification naming the buyer and order", () => {
    const email = supplierNotificationEmail(order, bakeryConfig.business);
    expect(email.subject).toContain("order-abc");
    expect(email.text).toContain("Happy Buyer");
    expect(email.text).toContain("happy@example.com");
  });

  it("surfaces link attribution in the supplier notification", () => {
    const attributed = buildOrder(
      bakeryConfig,
      {
        buyer: { name: "Cafe Rosa", contact: "orders@caferosa.example" },
        lines: [{ productId: "sourdough-classic", quantity: 4 }],
        buyerLinkToken: "tok_cafe",
      },
      {
        id: "order-link",
        now: 1_700_000_000_000,
        source: "portal",
        attribution: { token: "tok_cafe", buyerName: "Cafe Rosa" },
      },
    );
    const email = supplierNotificationEmail(attributed, bakeryConfig.business);
    expect(email.subject).toContain("Cafe Rosa via their link");
    expect(email.text).toContain("via their link");
  });

  it("sends to both buyer and supplier through the sendEmail seam", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendOrderEmails(order, bakeryConfig.business);
    const logged = spy.mock.calls.map((args) => String(args[0])).join("\n");
    expect(logged).toContain("to=happy@example.com");
    expect(logged).toContain(`to=${bakeryConfig.business.contact.email}`);
    spy.mockRestore();
  });
});
