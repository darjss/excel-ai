import { describe, expect, it } from "vitest";
import { wholesaleConfig } from "@/portal-config";
import { deriveEffectiveConfig } from "./effective-config";
import { applyReviewAction } from "./mutations";

describe("deriveEffectiveConfig", () => {
  it("keeps rules with no finding and rules whose finding is accepted", () => {
    const effective = deriveEffectiveConfig(wholesaleConfig).rules.map((rule) => rule.id);
    expect(effective).toContain("line-total");
    expect(effective).toContain("min-order-grains");
    expect(effective).toContain("tier-flour");
  });

  it("excludes a rule whose finding is an unconfirmed question", () => {
    const effective = deriveEffectiveConfig(wholesaleConfig).rules.map((rule) => rule.id);
    expect(effective).not.toContain("sales-tax");
  });

  it("drops findings that were not accepted", () => {
    const effective = deriveEffectiveConfig(wholesaleConfig);
    expect(effective.findings.every((finding) => finding.accepted)).toBe(true);
    expect(effective.findings.length).toBeLessThan(wholesaleConfig.findings.length);
  });

  it("removes the rule a rejected rule-finding points at", () => {
    const rejected = applyReviewAction(wholesaleConfig, {
      type: "finding-decision",
      findingId: "f-tier-flour",
      accepted: false,
    });
    const effective = deriveEffectiveConfig(rejected);
    expect(effective.rules.map((rule) => rule.id)).not.toContain("tier-flour");
    expect(effective.rules.map((rule) => rule.id)).toContain("line-total");
  });

  it("drops the rejected rule-finding along with its rule so refs stay valid", () => {
    const rejected = applyReviewAction(wholesaleConfig, {
      type: "finding-decision",
      findingId: "f-tier-flour",
      accepted: false,
    });
    const effective = deriveEffectiveConfig(rejected);
    const danglingRuleRefs = effective.findings.filter(
      (finding) => finding.targetRef?.kind === "rule" && finding.targetRef.id === "tier-flour",
    );
    expect(danglingRuleRefs).toHaveLength(0);
  });

  it("keeps a rule whose finding is accepted after being toggled back on", () => {
    const off = applyReviewAction(wholesaleConfig, {
      type: "finding-decision",
      findingId: "f-tax",
      accepted: false,
    });
    const on = applyReviewAction(off, {
      type: "finding-decision",
      findingId: "f-tax",
      accepted: true,
    });
    const effective = deriveEffectiveConfig(on);
    expect(effective.rules.map((rule) => rule.id)).toContain("sales-tax");
  });
});
