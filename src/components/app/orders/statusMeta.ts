import type { OrderStatus } from "@/server/orders/order";

interface StatusMeta {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
}

export const statusMeta: Record<OrderStatus, StatusMeta> = {
  received: { label: "Received", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  fulfilled: { label: "Fulfilled", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const transitionLabels: Partial<Record<OrderStatus, string>> = {
  confirmed: "Confirm",
  fulfilled: "Fulfil",
  cancelled: "Cancel",
};

export const transitionLabel = (status: OrderStatus): string => transitionLabels[status] ?? status;
