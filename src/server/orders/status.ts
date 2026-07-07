import type { OrderStatus } from "./order";

export const ORDER_STATUSES: readonly OrderStatus[] = [
  "received",
  "confirmed",
  "fulfilled",
  "cancelled",
];

const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  received: ["confirmed", "cancelled"],
  confirmed: ["fulfilled", "cancelled"],
  fulfilled: [],
  cancelled: [],
};

export const nextStatuses = (from: OrderStatus): readonly OrderStatus[] => allowedTransitions[from];

export const isTerminalStatus = (status: OrderStatus): boolean =>
  status === "fulfilled" || status === "cancelled";

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean =>
  allowedTransitions[from].includes(to);
