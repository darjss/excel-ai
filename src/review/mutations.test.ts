import { describe, expect, it } from "vitest";
import { wholesaleConfig } from "@/portal-config";
import { applyReviewAction, hasFinding } from "./mutations";

const findingById = (config: typeof wholesaleConfig, id: string) =>
  config.findings.find((finding) => finding.id === id);

describe("applyReviewAction", () => {
  it("accepts a previously-unaccepted finding", () => {
    const next = applyReviewAction(wholesaleConfig, {
      type: "finding-decision",
      findingId: "f-tax",
      accepted: true,
    });
    expect(findingById(next, "f-tax")?.accepted).toBe(true);
  });

  it("undoes a pre-accepted high-confidence finding", () => {
    const next = applyReviewAction(wholesaleConfig, {
      type: "finding-decision",
      findingId: "f-pricelist",
      accepted: false,
    });
    expect(findingById(next, "f-pricelist")?.accepted).toBe(false);
  });

  it("leaves other findings untouched", () => {
    const next = applyReviewAction(wholesaleConfig, {
      type: "finding-decision",
      findingId: "f-tax",
      accepted: true,
    });
    expect(findingById(next, "f-pricelist")).toEqual(findingById(wholesaleConfig, "f-pricelist"));
  });

  it("edits the business name", () => {
    const next = applyReviewAction(wholesaleConfig, {
      type: "edit-business-name",
      name: "Renamed Provisions",
    });
    expect(next.business.name).toBe("Renamed Provisions");
    expect(wholesaleConfig.business.name).toBe("Northgate Provisions");
  });

  it("reports whether a finding id exists", () => {
    expect(hasFinding(wholesaleConfig, "f-tax")).toBe(true);
    expect(hasFinding(wholesaleConfig, "missing")).toBe(false);
  });
});
