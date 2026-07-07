import { describe, expect, it } from "vitest";
import { shouldShowBadge } from "./badge";

describe("shouldShowBadge", () => {
  it("defaults to on", () => {
    expect(shouldShowBadge()).toBe(true);
  });

  it("stays on unless explicitly hidden", () => {
    expect(shouldShowBadge(false)).toBe(true);
  });

  it("hides when the tier flag requests it", () => {
    expect(shouldShowBadge(true)).toBe(false);
  });
});
