import { createId } from "@paralleldrive/cuid2";
import { Agent } from "agents";
import type { PlanSlug } from "@/lib/plans";
import { type ParseErrorDetail, type PortalConfig, parsePortalConfig } from "@/portal-config";
import {
  type BuyerLink,
  createBuyerLink,
  resolveSubmitAttribution,
  revokeBuyerLink,
} from "@/server/orders/buyer-links";
import {
  buildManualOrder,
  editOrderLines as editLines,
  type EditLineInput,
  type ManualOrderInput,
  unknownProductIds,
} from "@/server/orders/edit";
import { sendOrderEmails, sendStatusChangeEmail } from "@/server/orders/emails";
import {
  buildOrder,
  type Order,
  type OrderStatus,
  type SubmitOrderInput,
  type SubmitOrderResult,
} from "@/server/orders/order";
import { type OrdersPage, type OrdersPageParams, paginateOrders } from "@/server/orders/pagination";
import { canTransition, isTerminalStatus } from "@/server/orders/status";

export type SupplierEcho = {
  agent: "supplier";
  message: string;
  at: number;
};

export interface PortalState {
  config: PortalConfig | null;
  published: boolean;
  publishedTier: PlanSlug | null;
  orders: Order[];
  buyerLinks: BuyerLink[];
}

export interface PublishedPortal {
  config: PortalConfig;
  tier: PlanSlug;
}

export type SetPortalConfigResult =
  | { ok: true }
  | { ok: false; error: { message: string; details: readonly ParseErrorDetail[] } };

export type OrderMutationResult =
  | { kind: "ok"; order: Order }
  | { kind: "not-found" }
  | { kind: "not-published" }
  | { kind: "invalid-transition"; from: OrderStatus; to: OrderStatus }
  | { kind: "terminal-order" }
  | { kind: "unknown-product"; productIds: readonly string[] };

export class SupplierAgent extends Agent<Cloudflare.Env, PortalState> {
  initialState: PortalState = {
    config: null,
    published: false,
    publishedTier: null,
    orders: [],
    buyerLinks: [],
  };

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
    this.setState({ ...this.state, config: result.data, published: false, publishedTier: null });
    return { ok: true };
  }

  publish(tier: PlanSlug): boolean {
    if (!this.state.config) return false;
    this.setState({ ...this.state, published: true, publishedTier: tier });
    return true;
  }

  getPortalConfig(): PortalConfig | null {
    return this.state.published ? this.state.config : null;
  }

  getPublished(): PublishedPortal | null {
    if (!this.state.published || !this.state.config) return null;
    return { config: this.state.config, tier: this.state.publishedTier ?? "standard" };
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

  listOrdersPage(params: OrdersPageParams): OrdersPage {
    return paginateOrders(this.orders, params);
  }

  getOrder(id: string): Order | null {
    return this.orders.find((order) => order.id === id) ?? null;
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<OrderMutationResult> {
    const current = this.getOrder(id);
    if (!current) return { kind: "not-found" };
    if (!canTransition(current.status, status)) {
      return { kind: "invalid-transition", from: current.status, to: status };
    }

    const order: Order = { ...current, status, updatedAt: Date.now() };
    this.persist(order);

    if (status === "confirmed" || status === "cancelled") {
      const config = this.state.config;
      if (config) await sendStatusChangeEmail(order, config.business, status);
    }
    return { kind: "ok", order };
  }

  editOrderLines(id: string, lines: readonly EditLineInput[]): OrderMutationResult {
    const current = this.getOrder(id);
    if (!current) return { kind: "not-found" };
    if (isTerminalStatus(current.status)) return { kind: "terminal-order" };
    const config = this.getPortalConfig();
    if (!config) return { kind: "not-published" };

    const unknown = unknownProductIds(config, lines);
    if (unknown.length > 0) return { kind: "unknown-product", productIds: unknown };

    const order = editLines(current, config, lines, Date.now());
    this.persist(order);
    return { kind: "ok", order };
  }

  createManualOrder(input: ManualOrderInput): OrderMutationResult {
    const config = this.getPortalConfig();
    if (!config) return { kind: "not-published" };

    const unknown = unknownProductIds(config, input.lines);
    if (unknown.length > 0) return { kind: "unknown-product", productIds: unknown };

    const order = buildManualOrder(config, input, { id: createId(), now: Date.now() });
    this.setState({ ...this.state, orders: [...this.orders, order] });
    this.onOrderChanged(order);
    return { kind: "ok", order };
  }

  private persist(order: Order): void {
    this.setState({
      ...this.state,
      orders: this.orders.map((existing) => (existing.id === order.id ? order : existing)),
    });
    this.onOrderChanged(order);
  }

  private onOrderChanged(_order: Order): void {
    // TODO(#11): mirror the changed Order to the Orders Tab in the Source Sheet.
  }
}
