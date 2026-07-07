import { describe, expect, it } from "vitest";
import { resolvePortalTarget, slugFromHost, slugFromPath } from "./resolve";

const suffix = ".portals.localhost:4321";

describe("slugFromHost", () => {
  it("extracts the subdomain when the host matches the suffix", () => {
    expect(slugFromHost("bakery.portals.localhost:4321", suffix)).toBe("bakery");
  });

  it("returns null for the bare suffix host", () => {
    expect(slugFromHost("portals.localhost:4321", suffix)).toBeNull();
  });

  it("returns null for nested subdomains", () => {
    expect(slugFromHost("a.b.portals.localhost:4321", suffix)).toBeNull();
  });

  it("returns null when the host does not match the suffix", () => {
    expect(slugFromHost("example.com", suffix)).toBeNull();
  });

  it("returns null when no suffix is configured", () => {
    expect(slugFromHost("bakery.portals.localhost:4321", undefined)).toBeNull();
  });
});

describe("slugFromPath", () => {
  it("reads the slug from a portal path", () => {
    expect(slugFromPath("/portal/wholesale/catalog")).toBe("wholesale");
  });

  it("returns null for non-portal paths", () => {
    expect(slugFromPath("/pricing")).toBeNull();
  });
});

describe("resolvePortalTarget", () => {
  it("prefers host resolution and uses a root base path", () => {
    const target = resolvePortalTarget("bakery.portals.localhost:4321", "/catalog", suffix);
    expect(target).toEqual({ slug: "bakery", basePath: "" });
  });

  it("falls back to path resolution with a scoped base path", () => {
    const target = resolvePortalTarget("localhost:4321", "/portal/farmCsa", suffix);
    expect(target).toEqual({ slug: "farmCsa", basePath: "/portal/farmCsa" });
  });

  it("returns null when neither host nor path identify a portal", () => {
    expect(resolvePortalTarget("localhost:4321", "/pricing", suffix)).toBeNull();
  });
});
