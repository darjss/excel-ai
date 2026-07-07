import type { Finding, PortalConfig } from "@/portal-config";

const rejectedRuleId = (finding: Finding): string | null => {
  if (finding.accepted) return null;
  const ref = finding.targetRef;
  if (ref === undefined || ref.kind !== "rule") return null;
  return ref.id;
};

export const deriveEffectiveConfig = (config: PortalConfig): PortalConfig => {
  const removedRuleIds = new Set(
    config.findings.map(rejectedRuleId).filter((id): id is string => id !== null),
  );
  const rules = config.rules.filter((rule) => !removedRuleIds.has(rule.id));
  const findings = config.findings.filter((finding) => {
    if (!finding.accepted) return false;
    const ref = finding.targetRef;
    if (ref !== undefined && ref.kind === "rule" && removedRuleIds.has(ref.id)) return false;
    return true;
  });
  return { ...config, rules, findings };
};
