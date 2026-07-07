import type { OrderBuyer, SubmitOrderInput } from "./order";

export interface BuyerLink {
  token: string;
  buyerName: string;
  contact?: string;
  createdAt: number;
  revokedAt?: number | null;
}

export interface CreateBuyerLinkInput {
  token: string;
  buyerName: string;
  contact?: string;
  now: number;
}

const sanitize = (value: string): string => value.replace(/[\r\n]+/g, " ").trim();

export const createBuyerLink = (
  links: readonly BuyerLink[],
  input: CreateBuyerLinkInput,
): { links: BuyerLink[]; link: BuyerLink } => {
  const contact = input.contact ? sanitize(input.contact) : undefined;
  const link: BuyerLink = {
    token: input.token,
    buyerName: sanitize(input.buyerName),
    ...(contact ? { contact } : {}),
    createdAt: input.now,
    revokedAt: null,
  };
  return { links: [...links, link], link };
};

export const revokeBuyerLink = (
  links: readonly BuyerLink[],
  token: string,
  now: number,
): { links: BuyerLink[]; revoked: boolean } => {
  let revoked = false;
  const next = links.map((link) => {
    if (link.token !== token || link.revokedAt) return link;
    revoked = true;
    return { ...link, revokedAt: now };
  });
  return { links: next, revoked };
};

export type ResolvedBuyerLink =
  | { kind: "valid"; link: BuyerLink }
  | { kind: "revoked" }
  | { kind: "unknown" };

export const resolveBuyerLink = (
  links: readonly BuyerLink[],
  token: string,
): ResolvedBuyerLink => {
  const link = links.find((candidate) => candidate.token === token);
  if (!link) return { kind: "unknown" };
  if (link.revokedAt) return { kind: "revoked" };
  return { kind: "valid", link };
};

export interface OrderAttribution {
  token: string;
  buyerName: string;
}

export type SubmitAttribution =
  | { kind: "generic"; buyer: OrderBuyer; attribution: null }
  | { kind: "attributed"; buyer: OrderBuyer; attribution: OrderAttribution }
  | { kind: "invalid-link" };

export const resolveSubmitAttribution = (
  links: readonly BuyerLink[],
  input: SubmitOrderInput,
): SubmitAttribution => {
  const token = input.buyerLinkToken?.trim();
  if (!token) return { kind: "generic", buyer: input.buyer, attribution: null };

  const resolved = resolveBuyerLink(links, token);
  if (resolved.kind !== "valid") return { kind: "invalid-link" };

  const { link } = resolved;
  return {
    kind: "attributed",
    buyer: { name: link.buyerName, contact: link.contact ?? input.buyer.contact },
    attribution: { token: link.token, buyerName: link.buyerName },
  };
};
