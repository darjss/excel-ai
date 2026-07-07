import type { Order } from "./order";

export const MAX_ORDERS_PAGE_SIZE = 50;

export const CURSOR_PATTERN = "^[0-9]+:.+$";

export const isValidCursor = (cursor: string): boolean => new RegExp(CURSOR_PATTERN).test(cursor);

export interface OrdersPageParams {
  cursor?: string | null;
  take?: number;
}

export interface OrdersPage {
  orders: Order[];
  nextCursor: string | null;
}

const cursorOf = (order: Order): string => `${order.createdAt}:${order.id}`;

const isBefore = (order: Order, cursor: string): boolean => cursorOf(order) < cursor;

const byCreatedAtDesc = (a: Order, b: Order): number =>
  b.createdAt - a.createdAt || (cursorOf(a) < cursorOf(b) ? 1 : -1);

const clampTake = (take: number | undefined): number => {
  if (!take || take < 1) return MAX_ORDERS_PAGE_SIZE;
  return Math.min(take, MAX_ORDERS_PAGE_SIZE);
};

export const paginateOrders = (orders: readonly Order[], params: OrdersPageParams): OrdersPage => {
  const take = clampTake(params.take);
  const sorted = [...orders].sort(byCreatedAtDesc);
  const after = params.cursor ? sorted.filter((order) => isBefore(order, params.cursor ?? "")) : sorted;
  const page = after.slice(0, take);
  const last = page.at(-1);
  const nextCursor = last && after.length > take ? cursorOf(last) : null;
  return { orders: page, nextCursor };
};
