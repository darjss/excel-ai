import type { OrderMutationResult } from "@/server/agents/supplier";
import type { Order } from "@/server/orders/order";
import { AppError, ConflictError, NotFoundError } from "../errors";

export const resolveMutation = (result: OrderMutationResult): Order => {
  switch (result.kind) {
    case "ok":
      return result.order;
    case "not-found":
      throw new NotFoundError("Order not found");
    case "not-published":
      throw new NotFoundError("Portal not found");
    case "invalid-transition":
      throw new ConflictError(`Cannot move order from ${result.from} to ${result.to}`);
    case "terminal-order":
      throw new ConflictError("This order is finalized and can no longer be edited");
    case "unknown-product":
      throw new AppError("validation", "Unknown product in order lines", {
        productIds: result.productIds,
      });
  }
};
