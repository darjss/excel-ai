import { describe, expect, it } from "vitest";
import { bakeryConfig, parsePortalConfig, portalConfigFixtures } from "@/portal-config";

describe("portal config door validation", () => {
  it("accepts every published fixture", () => {
    for (const config of Object.values(portalConfigFixtures)) {
      expect(parsePortalConfig(config).ok).toBe(true);
    }
  });

  it("rejects a config with a broken palette color", () => {
    const broken = structuredClone(bakeryConfig);
    broken.style.theme.palette.primary = "not-a-hex";
    expect(parsePortalConfig(broken).ok).toBe(false);
  });

  it("rejects a config missing required business fields", () => {
    const broken = structuredClone(bakeryConfig) as { business: { name?: string } };
    delete broken.business.name;
    expect(parsePortalConfig(broken).ok).toBe(false);
  });
});
