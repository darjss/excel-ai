import type { Finding, PortalConfig } from "@/portal-config";

export type ReviewAction =
  | { type: "finding-decision"; findingId: string; accepted: boolean }
  | { type: "edit-business-name"; name: string };

const decideFinding = (finding: Finding, findingId: string, accepted: boolean): Finding =>
  finding.id === findingId ? { ...finding, accepted } : finding;

export const applyReviewAction = (config: PortalConfig, action: ReviewAction): PortalConfig => {
  switch (action.type) {
    case "finding-decision":
      return {
        ...config,
        findings: config.findings.map((finding) =>
          decideFinding(finding, action.findingId, action.accepted),
        ),
      };
    case "edit-business-name":
      return { ...config, business: { ...config.business, name: action.name } };
  }
};

export const hasFinding = (config: PortalConfig, findingId: string): boolean =>
  config.findings.some((finding) => finding.id === findingId);
