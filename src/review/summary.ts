import type { Finding, PortalConfig } from "@/portal-config";

export type FindingGroupKind = "rule" | "product" | "category" | "general";

export interface FindingsSummary {
  confirmed: number;
  questions: number;
}

export interface FindingGroup {
  kind: FindingGroupKind;
  findings: Finding[];
}

const GROUP_ORDER: FindingGroupKind[] = ["rule", "product", "category", "general"];

const groupKind = (finding: Finding): FindingGroupKind => finding.targetRef?.kind ?? "general";

export const isOpenQuestion = (finding: Finding): boolean =>
  finding.question !== undefined && !finding.accepted;

export const summarizeFindings = (findings: readonly Finding[]): FindingsSummary => ({
  confirmed: findings.filter((finding) => finding.accepted).length,
  questions: findings.filter(isOpenQuestion).length,
});

export const groupFindingList = (findings: readonly Finding[]): FindingGroup[] =>
  GROUP_ORDER.map((kind) => ({
    kind,
    findings: findings.filter((finding) => groupKind(finding) === kind),
  })).filter((group) => group.findings.length > 0);

export const groupFindings = (config: PortalConfig): FindingGroup[] =>
  groupFindingList(config.findings);
