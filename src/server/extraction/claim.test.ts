import { describe, expect, it } from "vitest";
import type { PortalConfig } from "@/portal-config";
import type { ExtractionState, ExtractionStatus } from "@/server/agents/extraction";
import { canClaim, isClaimBlocked, readyConfig } from "./claim";

describe("isClaimBlocked", () => {
  it("blocks a non-owner from a claimed job (refine + SSE lock → 403)", () => {
    expect(isClaimBlocked({ userId: "owner" }, "intruder")).toBe(true);
  });

  it("blocks an anonymous request from a claimed job", () => {
    expect(isClaimBlocked({ userId: "owner" }, undefined)).toBe(true);
  });

  it("lets the owner through", () => {
    expect(isClaimBlocked({ userId: "owner" }, "owner")).toBe(false);
  });

  it("lets anyone through an unclaimed builder-mode job (the funnel stays open)", () => {
    expect(isClaimBlocked(undefined, undefined)).toBe(false);
    expect(isClaimBlocked(undefined, "anyone")).toBe(false);
  });
});

describe("canClaim", () => {
  it("allows claiming a ready draft", () => {
    expect(canClaim("ready")).toBe(true);
  });

  it("rejects claiming a builder-mode or needs-human job (→ 409)", () => {
    const rejected: ExtractionStatus[] = ["builder-mode", "needs-human", "running", "idle"];
    for (const status of rejected) expect(canClaim(status)).toBe(false);
  });
});

describe("readyConfig", () => {
  const base: Omit<ExtractionState, "outcome" | "status"> = {
    events: [],
    r2Key: null,
    published: false,
    slug: null,
    answeredFindingIds: [],
  };
  const config = { business: { name: "Acme" }, findings: [] } as unknown as PortalConfig;

  it("reads the config from a ready outcome", () => {
    const state: ExtractionState = {
      ...base,
      status: "ready",
      outcome: { kind: "ready", config, report: { anomalies: [], downgrades: [] }, iterations: 0 },
    };
    expect(readyConfig(state)).toBe(config);
  });

  it("returns null for non-ready outcomes", () => {
    const state: ExtractionState = {
      ...base,
      status: "builder-mode",
      outcome: { kind: "builder-mode", message: "pick a table", preview: [] },
    };
    expect(readyConfig(state)).toBeNull();
  });
});
