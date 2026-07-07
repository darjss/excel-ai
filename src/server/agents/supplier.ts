import { Agent } from "agents";
import { type ParseErrorDetail, type PortalConfig, parsePortalConfig } from "@/portal-config";

export type SupplierEcho = {
  agent: "supplier";
  message: string;
  at: number;
};

export interface PortalState {
  config: PortalConfig | null;
  published: boolean;
}

export type SetPortalConfigResult =
  | { ok: true }
  | { ok: false; error: { message: string; details: readonly ParseErrorDetail[] } };

export class SupplierAgent extends Agent<Cloudflare.Env, PortalState> {
  initialState: PortalState = { config: null, published: false };

  echo(message: string): SupplierEcho {
    return { agent: "supplier", message, at: Date.now() };
  }

  setPortalConfig(input: unknown): SetPortalConfigResult {
    const result = parsePortalConfig(input);
    if (!result.ok) {
      return { ok: false, error: { message: result.error.message, details: result.error.details } };
    }
    this.setState({ config: result.data, published: false });
    return { ok: true };
  }

  publish(): boolean {
    if (!this.state.config) return false;
    this.setState({ config: this.state.config, published: true });
    return true;
  }

  getPortalConfig(): PortalConfig | null {
    return this.state.published ? this.state.config : null;
  }
}
