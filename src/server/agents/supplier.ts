import { Agent } from "agents";

export type SupplierEcho = {
  agent: "supplier";
  message: string;
  at: number;
};

export class SupplierAgent extends Agent<Cloudflare.Env> {
  echo(message: string): SupplierEcho {
    return { agent: "supplier", message, at: Date.now() };
  }
}
