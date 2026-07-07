import type { PortalConfig } from "@/portal-config";
import type { ExtractionState, ExtractionStatus } from "@/server/agents/extraction";

export const isClaimBlocked = (
  claim: { userId: string } | undefined,
  userId: string | undefined,
): boolean => claim !== undefined && claim.userId !== userId;

export const canClaim = (status: ExtractionStatus): boolean => status === "ready";

export const readyConfig = (state: ExtractionState): PortalConfig | null =>
  state.outcome?.kind === "ready" ? state.outcome.config : null;
