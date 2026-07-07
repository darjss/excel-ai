import { describe, expect, it, vi } from "vitest";
import { bakeryConfig } from "./fixtures";
import { parsePortalConfig, repairAndParse } from "./parse";

describe("parsePortalConfig", () => {
  it("returns typed data on success", () => {
    const result = parsePortalConfig(bakeryConfig);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.business.name).toBe("Rosewater Bakery");
  });

  it("returns a typed validation error on failure", () => {
    const result = parsePortalConfig({ nonsense: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("validation");
  });
});

describe("repairAndParse", () => {
  it("returns immediately when the raw input is valid", async () => {
    const repair = vi.fn(async () => bakeryConfig);
    const result = await repairAndParse(bakeryConfig, repair);
    expect(result.ok).toBe(true);
    expect(repair).not.toHaveBeenCalled();
  });

  it("retries with the repair callback and succeeds", async () => {
    const broken = { ...bakeryConfig, business: { ...bakeryConfig.business, name: "" } };
    const repair = vi.fn(async () => bakeryConfig);
    const result = await repairAndParse(broken, repair);
    expect(result.ok).toBe(true);
    expect(repair).toHaveBeenCalledTimes(1);
  });

  it("passes the validation issues to the repair callback", async () => {
    const broken = { ...bakeryConfig, version: 2 };
    const repair = vi.fn(async (_previous: unknown, issues: readonly string[]) => {
      expect(issues.length).toBeGreaterThan(0);
      return bakeryConfig;
    });
    await repairAndParse(broken, repair);
    expect(repair).toHaveBeenCalledTimes(1);
  });

  it("exhausts attempts and fails with a typed error when repair never fixes it", async () => {
    const repair = vi.fn(async () => ({ still: "broken" }));
    const result = await repairAndParse({ broken: true }, repair, 2);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("repair_exhausted");
      expect(result.error.message).toContain("2 repair attempt");
    }
    expect(repair).toHaveBeenCalledTimes(2);
  });
});
