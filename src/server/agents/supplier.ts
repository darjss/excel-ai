import { createId } from "@paralleldrive/cuid2";
import { Agent } from "agents";
import { type ParseErrorDetail, type PortalConfig, parsePortalConfig } from "@/portal-config";
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
}

export type SetPortalConfigResult =
  | { ok: true }
  | { ok: false; error: { message: string; details: readonly ParseErrorDetail[] } };

export class SupplierAgent extends Agent<Cloudflare.Env, PortalState> {
  initialState: PortalState = { config: null, published: false, orders: [] };

  private get orders(): Order[] {
    return this.state.orders ?? [];
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

  async submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
    const config = this.getPortalConfig();
    if (!config) return { kind: "not-published" };

    const order = buildOrder(config, input, {
      id: createId(),
      now: Date.now(),
      source: "portal",
    });

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
