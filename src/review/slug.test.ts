import { describe, expect, it } from "vitest";
import { isValidSlug, suggestSlug } from "./slug";

describe("suggestSlug", () => {
  it("slugifies a business name", () => {
    expect(suggestSlug("Northgate Provisions")).toBe("northgate-provisions");
  });

  it("collapses punctuation and trims separators", () => {
    expect(suggestSlug("  Bob's Bakery & Co.  ")).toBe("bob-s-bakery-co");
  });

  it("returns empty when nothing usable remains", () => {
    expect(suggestSlug("!!!")).toBe("");
  });

  it("returns empty for a reserved name", () => {
    expect(suggestSlug("Admin")).toBe("");
  });
});

describe("isValidSlug", () => {
  it("accepts a well-formed slug", () => {
    expect(isValidSlug("northgate-provisions")).toBe(true);
  });

  it("rejects reserved, malformed, and edge-hyphen slugs", () => {
    expect(isValidSlug("app")).toBe(false);
    expect(isValidSlug("-lead")).toBe(false);
    expect(isValidSlug("trail-")).toBe(false);
    expect(isValidSlug("Upper")).toBe(false);
    expect(isValidSlug("a")).toBe(true);
    expect(isValidSlug("")).toBe(false);
  });
});
