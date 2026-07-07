import { getAgentByName } from "agents";
import { env } from "cloudflare:workers";
import { Elysia, t } from "elysia";
import type { SupplierAgent } from "@/server/agents/supplier";

export const agentRoute = new Elysia().get(
  "/agent/ping",
  async () => {
    const agent = await getAgentByName<Cloudflare.Env, SupplierAgent>(env.SUPPLIER, "smoke");
    return agent.echo("ping");
  },
  {
    response: t.Object({
      agent: t.Literal("supplier"),
      message: t.String(),
      at: t.Number(),
    }),
  },
);
