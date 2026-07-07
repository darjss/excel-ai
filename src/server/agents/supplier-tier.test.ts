import { describe, expect, it, vi } from "vitest";

vi.mock("agents", () => ({ Agent: class {} }));
vi.mock("@/server/lib/email", () => ({ sendEmail: () => Promise.resolve() }));

import type { PortalConfig } from "@/portal-config";
import { type PortalState, SupplierAgent } from "./supplier";

const harness = (over: Partial<PortalState> = {}) => {
  let state: PortalState = {
    config: null,
    published: false,
    publishedTier: null,
    orders: [],
    buyerLinks: [],
    ...over,
  };
  const agent: SupplierAgent = Object.create(SupplierAgent.prototype);
  Object.defineProperty(agent, "state", { get: () => state });
  Object.defineProperty(agent, "setState", { value: (next: PortalState) => void (state = next) });
  return { agent, snapshot: () => state };
};

const config = { business: { name: "Acme" } } as unknown as PortalConfig;

describe("SupplierAgent tier stamping", () => {
  it("refuses to publish without a config", () => {
    const { agent, snapshot } = harness();
    expect(agent.publish("pro")).toBe(false);
    expect(snapshot().published).toBe(false);
    expect(snapshot().publishedTier).toBeNull();
  });

  it("stamps the tier into the durable object at publish time", () => {
    const { agent, snapshot } = harness({ config });
    expect(agent.publish("pro")).toBe(true);
    expect(snapshot().published).toBe(true);
    expect(snapshot().publishedTier).toBe("pro");
    expect(agent.getPublished()).toEqual({ config, tier: "pro" });
  });

  it("exposes the stamped standard tier", () => {
    const { agent } = harness({ config });
    agent.publish("standard");
    expect(agent.getPublished()).toEqual({ config, tier: "standard" });
  });

  it("returns null from getPublished until published", () => {
    const { agent } = harness({ config });
    expect(agent.getPublished()).toBeNull();
  });

  it("defaults an already-published portal with no stamped tier to standard", () => {
    const { agent } = harness({ config, published: true, publishedTier: null });
    expect(agent.getPublished()).toEqual({ config, tier: "standard" });
  });

  it("restamps the tier of a published portal", () => {
    const { agent, snapshot } = harness({ config, published: true, publishedTier: "standard" });
    expect(agent.updatePublishedTier("pro")).toBe(true);
    expect(snapshot().publishedTier).toBe("pro");
    expect(agent.getPublished()).toEqual({ config, tier: "pro" });
  });

  it("no-ops updatePublishedTier when the portal is unpublished", () => {
    const { agent, snapshot } = harness({ config, published: false, publishedTier: null });
    expect(agent.updatePublishedTier("pro")).toBe(false);
    expect(snapshot().publishedTier).toBeNull();
    expect(snapshot().published).toBe(false);
  });
});
