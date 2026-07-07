import { describe, expect, it } from "vitest";
import {
  type BuyerLink,
  createBuyerLink,
  resolveBuyerLink,
  resolveSubmitAttribution,
  revokeBuyerLink,
} from "./buyer-links";
import type { SubmitOrderInput } from "./order";

const now = 1_700_000_000_000;

const seed = (): { links: BuyerLink[]; token: string } => {
  const { links, link } = createBuyerLink([], {
    token: "tok_cafe",
    buyerName: "Cafe Rosa",
    contact: "orders@caferosa.example",
    now,
  });
  return { links, token: link.token };
};

const submit = (token: string | null): SubmitOrderInput => ({
  buyer: { name: "Typed Name", contact: "typed@example.com" },
  lines: [{ productId: "sourdough-classic", quantity: 4 }],
  buyerLinkToken: token,
});

describe("buyer link reducers", () => {
  it("creates a link with a null revokedAt and trimmed fields", () => {
    const { links, link } = createBuyerLink([], {
      token: "tok_1",
      buyerName: "  Cafe Rosa\n",
      contact: " a@b.com ",
      now,
    });
    expect(links).toHaveLength(1);
    expect(link.buyerName).toBe("Cafe Rosa");
    expect(link.contact).toBe("a@b.com");
    expect(link.revokedAt).toBeNull();
  });

  it("omits contact when none is supplied", () => {
    const { link } = createBuyerLink([], { token: "tok_2", buyerName: "Solo", now });
    expect(link.contact).toBeUndefined();
  });

  it("lists all links including revoked ones", () => {
    const { links } = seed();
    const { links: after } = revokeBuyerLink(links, "tok_cafe", now + 1);
    expect(after).toHaveLength(1);
    expect(after[0]?.revokedAt).toBe(now + 1);
  });

  it("revokes only a matching, still-active token", () => {
    const { links } = seed();
    const revoked = revokeBuyerLink(links, "tok_cafe", now + 1);
    expect(revoked.revoked).toBe(true);
    const again = revokeBuyerLink(revoked.links, "tok_cafe", now + 2);
    expect(again.revoked).toBe(false);
    expect(again.links[0]?.revokedAt).toBe(now + 1);
    const missing = revokeBuyerLink(links, "nope", now + 1);
    expect(missing.revoked).toBe(false);
  });

  it("resolves valid, revoked and unknown tokens", () => {
    const { links } = seed();
    expect(resolveBuyerLink(links, "tok_cafe").kind).toBe("valid");
    expect(resolveBuyerLink(links, "missing").kind).toBe("unknown");
    const { links: revoked } = revokeBuyerLink(links, "tok_cafe", now + 1);
    expect(resolveBuyerLink(revoked, "tok_cafe").kind).toBe("revoked");
  });
});

describe("resolveSubmitAttribution", () => {
  it("keeps client-typed identity for a generic (tokenless) submission", () => {
    const result = resolveSubmitAttribution([], submit(null));
    expect(result.kind).toBe("generic");
    if (result.kind !== "generic") throw new Error("expected generic");
    expect(result.buyer.name).toBe("Typed Name");
    expect(result.attribution).toBeNull();
  });

  it("attributes to the link buyer and stored contact for a valid token", () => {
    const { links, token } = seed();
    const result = resolveSubmitAttribution(links, submit(token));
    expect(result.kind).toBe("attributed");
    if (result.kind !== "attributed") throw new Error("expected attributed");
    expect(result.buyer.name).toBe("Cafe Rosa");
    expect(result.buyer.contact).toBe("orders@caferosa.example");
    expect(result.attribution.token).toBe(token);
    expect(result.attribution.buyerName).toBe("Cafe Rosa");
  });

  it("falls back to typed contact when the link stores none", () => {
    const { links } = createBuyerLink([], { token: "tok_nc", buyerName: "No Contact", now });
    const result = resolveSubmitAttribution(links, submit("tok_nc"));
    if (result.kind !== "attributed") throw new Error("expected attributed");
    expect(result.buyer.contact).toBe("typed@example.com");
  });

  it("rejects revoked and unknown tokens", () => {
    const { links } = seed();
    const { links: revoked } = revokeBuyerLink(links, "tok_cafe", now + 1);
    expect(resolveSubmitAttribution(revoked, submit("tok_cafe")).kind).toBe("invalid-link");
    expect(resolveSubmitAttribution(links, submit("ghost")).kind).toBe("invalid-link");
  });
});
