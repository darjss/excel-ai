import { describe, expect, it, vi } from "vitest";

const { mockRunExtraction, mockUploadsGet } = vi.hoisted(() => ({
  mockRunExtraction: vi.fn(),
  mockUploadsGet: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({
  env: { UPLOADS: { get: mockUploadsGet }, AI: {}, AI_GATEWAY_ID: undefined },
}));
vi.mock("agents", () => ({ Agent: class {} }));
vi.mock("@/extraction/agent/extract", () => ({ runExtraction: mockRunExtraction }));
vi.mock("@/extraction/agent/models", () => ({
  withTimeout: (fn: unknown) => fn,
  createChatFn: () => async () => ({}),
  gatewayFromEnv: () => undefined,
  DEFAULT_MODEL_CALL_TIMEOUT_MS: 120_000,
}));

import type { PortalConfig } from "@/portal-config";
import type { ExtractionOutcome } from "@/extraction/ladder/types";
import { readyConfig } from "@/server/extraction/claim";
import { ExtractionAgent, type ExtractionState } from "./extraction";

const configWith = (name: string, findings: PortalConfig["findings"] = []): PortalConfig =>
  ({ business: { name }, findings }) as unknown as PortalConfig;

const harness = (overrides: Partial<ExtractionState> = {}) => {
  let state: ExtractionState = {
    status: "idle",
    events: [],
    outcome: null,
    r2Key: null,
    published: false,
    slug: null,
    answeredFindingIds: [],
    runStartedAt: null,
    watchdogId: null,
    ...overrides,
  };
  const agent: ExtractionAgent = Object.create(ExtractionAgent.prototype);
  Object.defineProperty(agent, "state", { get: () => state });
  Object.defineProperty(agent, "setState", { value: (next: ExtractionState) => void (state = next) });
  Object.defineProperty(agent, "schedule", { value: vi.fn(async () => ({ id: "w1" })) });
  Object.defineProperty(agent, "cancelSchedule", { value: vi.fn(async () => {}) });
  return { agent, snapshot: () => state };
};

describe("ExtractionAgent.seed", () => {
  it("round-trips a config into a ready outcome the review flow can read", () => {
    const { agent, snapshot } = harness();
    agent.seed(configWith("Acme"));

    const after = snapshot();
    expect(after.status).toBe("ready");
    expect(after.outcome).toEqual({
      kind: "ready",
      config: configWith("Acme"),
      report: { anomalies: [], downgrades: [] },
      iterations: 0,
    });
    expect(readyConfig(after)?.business.name).toBe("Acme");
  });
});

describe("ExtractionAgent.applyReview", () => {
  it("refuses to apply when the draft is not ready", () => {
    const { agent } = harness();
    const result = agent.applyReview({ type: "edit-business-name", name: "New" });
    expect(result).toEqual({ ok: false, reason: "not_ready" });
  });

  it("writes edits back into the ready outcome", () => {
    const { agent, snapshot } = harness();
    agent.seed(configWith("Acme"));
    const result = agent.applyReview({ type: "edit-business-name", name: "Renamed" });

    expect(result.ok).toBe(true);
    expect(readyConfig(snapshot())?.business.name).toBe("Renamed");
  });
});

describe("ExtractionAgent.markPublished", () => {
  it("is a no-op unless the draft is ready", () => {
    const { agent, snapshot } = harness();
    agent.markPublished("acme");
    expect(snapshot().published).toBe(false);
    expect(snapshot().slug).toBeNull();
  });

  it("records the slug once ready", () => {
    const { agent, snapshot } = harness();
    agent.seed(configWith("Acme"));
    agent.markPublished("acme");
    expect(snapshot().published).toBe(true);
    expect(snapshot().slug).toBe("acme");
  });
});

describe("ExtractionAgent.onWatchdogAlarm", () => {
  it("fails a hung run into a needs-human outcome the SSE terminal frame can read", async () => {
    const { agent, snapshot } = harness({
      status: "running",
      runStartedAt: 0,
      watchdogId: "w1",
      events: [],
    });
    await agent.onWatchdogAlarm();

    const after = snapshot();
    expect(after.status).toBe("needs-human");
    expect(after.outcome?.kind).toBe("needs-human");
    if (after.outcome?.kind === "needs-human") expect(after.outcome.reason).toBe("internal");
  });

  it("leaves a run that already settled untouched", async () => {
    const { agent, snapshot } = harness();
    agent.seed(configWith("Acme"));
    await agent.onWatchdogAlarm();

    expect(snapshot().status).toBe("ready");
    expect(snapshot().outcome?.kind).toBe("ready");
  });
});

describe("ExtractionAgent.run vs watchdog interleaving", () => {
  it("holds the terminal watchdog verdict when the model resolves ready after the alarm fired", async () => {
    const { agent, snapshot } = harness({
      status: "running",
      runStartedAt: 0,
      watchdogId: "w1",
      r2Key: "key",
    });
    mockUploadsGet.mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(0) });
    let resolveExtraction: (value: ExtractionOutcome) => void = () => {};
    mockRunExtraction.mockImplementation(
      () => new Promise<ExtractionOutcome>((resolve) => void (resolveExtraction = resolve)),
    );

    const runPromise = (agent as unknown as { run(key: string): Promise<void> }).run("key");
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(snapshot().status).toBe("running");
    expect(mockRunExtraction).toHaveBeenCalledOnce();

    await agent.onWatchdogAlarm();
    const afterAlarm = snapshot();
    expect(afterAlarm.status).toBe("needs-human");
    expect(afterAlarm.outcome?.kind).toBe("needs-human");

    resolveExtraction({
      kind: "ready",
      config: configWith("Acme"),
      report: { anomalies: [], downgrades: [] },
      iterations: 1,
    });
    await runPromise;

    const final = snapshot();
    expect(final.status).toBe("needs-human");
    expect(final.outcome?.kind).toBe("needs-human");
    expect(afterAlarm.status).toBe("needs-human");
  });
});
