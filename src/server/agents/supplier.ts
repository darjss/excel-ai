import { createId } from "@paralleldrive/cuid2";
import { Agent } from "agents";
import { type ParseErrorDetail, type PortalConfig, parsePortalConfig } from "@/portal-config";
import {
  type BuyerLink,
  createBuyerLink,
  resolveSubmitAttribution,
  revokeBuyerLink,
} from "@/server/orders/buyer-links";
import { sendOrderEmails } from "@/server/orders/emails";
import {
  buildOrder,
  type Order,
  type SubmitOrderInput,
  type SubmitOrderResult,
} from "@/server/orders/order";

export type SupplierEcho = {
  agent: "supplier";
  message: string;
  at: number;
};

export interface PortalState {
  config: PortalConfig | null;
  published: boolean;
  orders: Order[];
  buyerLinks: BuyerLink[];
}

export type SetPortalConfigResult =
  | { ok: true }
  | { ok: false; error: { message: string; details: readonly ParseErrorDetail[] } };

export class SupplierAgent extends Agent<Cloudflare.Env, PortalState> {
  initialState: PortalState = { config: null, published: false, orders: [], buyerLinks: [] };

  private get orders(): Order[] {
    return this.state.orders ?? [];
  }

  private get buyerLinks(): BuyerLink[] {
    return this.state.buyerLinks ?? [];
  }

  echo(message: string): SupplierEcho {
    return { agent: "supplier", message, at: Date.now() };
  }

  setPortalConfig(input: unknown): SetPortalConfigResult {
    const result = parsePortalConfig(input);
    if (!result.ok) {
      return { ok: false, error: { message: result.error.message, details: result.error.details } };
    }
    this.setState({ ...this.state, config: result.data, published: false });
    return { ok: true };
  }

  publish(): boolean {
    if (!this.state.config) return false;
    this.setState({ ...this.state, published: true });
    return true;
  }

  getPortalConfig(): PortalConfig | null {
    return this.state.published ? this.state.config : null;
  }

  createBuyerLink(buyerName: string, contact?: string): BuyerLink {
    const result = createBuyerLink(this.buyerLinks, {
      token: createId(),
      buyerName,
      contact,
      now: Date.now(),
    });
    this.setState({ ...this.state, buyerLinks: result.links });
    return result.link;
  }

  revokeBuyerLink(token: string): boolean {
    const result = revokeBuyerLink(this.buyerLinks, token, Date.now());
    if (result.revoked) this.setState({ ...this.state, buyerLinks: result.links });
    return result.revoked;
  }

  listBuyerLinks(): BuyerLink[] {
    return this.buyerLinks;
  }

  async submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
    const config = this.getPortalConfig();
    if (!config) return { kind: "not-published" };

    const resolved = resolveSubmitAttribution(this.buyerLinks, input);
    if (resolved.kind === "invalid-link") return { kind: "invalid-link" };

    const order = buildOrder(
      config,
      { ...input, buyer: resolved.buyer },
      {
        id: createId(),
        now: Date.now(),
        source: "portal",
        attribution: resolved.attribution,
      },
    );

    if (order.violations.length > 0) {
      return { kind: "violations", violations: order.violations };
    }

    this.setState({ ...this.state, orders: [...this.orders, order] });
    await sendOrderEmails(order, config.business);
    return { kind: "ok", order };
  }

  listOrders(): Order[] {
    return this.orders;
  }

  getOrder(id: string): Order | null {
    return this.orders.find((order) => order.id === id) ?? null;
  }
}
