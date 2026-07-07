import { describe, expect, it } from "vitest";
import type { RateLimitStore } from "../api/rate-limit";
import {
  submitWhiteGlove,
  type WhiteGloveInput,
  type WhiteGloveStore,
} from "./white-glove";

const memoryKv = (): RateLimitStore => {
  const map = new Map<string, string>();
  return {
    get: async (key) => map.get(key) ?? null,
    put: async (key, value) => {
      map.set(key, value);
    },
  };
};

const recordingStore = () => {
  const rows: WhiteGloveInput[] = [];
  const store: WhiteGloveStore = { insert: async (row) => void rows.push(row) };
  return { store, rows };
};

const validBody = { email: "supplier@example.com", jobId: "job_123", reason: "macro-workbook" };

describe("submitWhiteGlove", () => {
  it("stores a valid request", async () => {
    const { store, rows } = recordingStore();
    const result = await submitWhiteGlove(
      { store, cache: memoryKv(), ip: "1.1.1.1", limitVar: "3" },
      validBody,
    );
    expect(result.ok).toBe(true);
    expect(rows).toEqual([validBody]);
  });

  it("rejects an invalid email without storing", async () => {
    const { store, rows } = recordingStore();
    const result = await submitWhiteGlove(
      { store, cache: memoryKv(), ip: "1.1.1.1", limitVar: "3" },
      { ...validBody, email: "not-an-email" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("validation");
    expect(rows).toHaveLength(0);
  });

  it("rejects an unknown reason", async () => {
    const { store } = recordingStore();
    const result = await submitWhiteGlove(
      { store, cache: memoryKv(), ip: "1.1.1.1", limitVar: "3" },
      { ...validBody, reason: "banana" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("validation");
  });

  it("rate-limits after the configured number of requests", async () => {
    const { store, rows } = recordingStore();
    const cache = memoryKv();
    const deps = { store, cache, ip: "2.2.2.2", limitVar: "2" };
    expect((await submitWhiteGlove(deps, validBody)).ok).toBe(true);
    expect((await submitWhiteGlove(deps, validBody)).ok).toBe(true);
    const third = await submitWhiteGlove(deps, validBody);
    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.code).toBe("rate_limited");
    expect(rows).toHaveLength(2);
  });
});
