import { planBySlug } from "@/lib/plans";

export type BillingStatus = "active" | "canceled" | "past_due" | "none";

export interface BillingState {
  planSlug: string | null;
  status: BillingStatus;
  currentPeriodEnd: number | null;
}

export interface BillingView {
  planName: string;
  statusLabel: string;
  periodEndLabel: string | null;
  isActive: boolean;
  canUpgrade: boolean;
}

export const toBillingStatus = (value: string): BillingStatus => {
  switch (value) {
    case "active":
    case "canceled":
    case "past_due":
      return value;
    default:
      return "none";
  }
};

const STATUS_LABELS: Record<BillingStatus, string> = {
  active: "Active",
  canceled: "Canceled",
  past_due: "Past due",
  none: "No plan",
};

export const deriveBillingView = (state: BillingState): BillingView => {
  const plan = state.planSlug ? planBySlug(state.planSlug) : null;
  return {
    planName: plan?.name ?? "No plan",
    statusLabel: STATUS_LABELS[state.status],
    periodEndLabel:
      state.currentPeriodEnd === null ? null : new Date(state.currentPeriodEnd).toLocaleDateString(),
    isActive: state.status === "active",
    canUpgrade: state.status === "active" && plan?.slug === "standard",
  };
};
