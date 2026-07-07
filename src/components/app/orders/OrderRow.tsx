import { For, Show } from "solid-js";
import { toast } from "solid-sonner";
import { formatMoney } from "@/components/portal/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { queryErrorMessage } from "@/lib/api";
import { useUpdateOrderStatus } from "@/lib/queries/orders";
import type { PortalConfig } from "@/portal-config";
import type { Order } from "@/server/orders/order";
import { nextStatuses } from "@/server/orders/status";
import { EditLinesDialog } from "./EditLinesDialog";
import { statusMeta, transitionLabel } from "./statusMeta";

interface OrderRowProps {
  slug: string;
  order: Order;
  config: PortalConfig | undefined;
}

export const OrderRow = (props: OrderRowProps) => {
  const updateStatus = useUpdateOrderStatus(() => props.slug);

  const move = (status: Order["status"]) =>
    updateStatus.mutate(
      { id: props.order.id, status },
      { onError: (error) => toast.error(queryErrorMessage(error)) },
    );

  return (
    <TableRow>
      <TableCell>
        <Badge variant={statusMeta[props.order.status].variant}>
          {statusMeta[props.order.status].label}
        </Badge>
      </TableCell>
      <TableCell>
        <div class="flex flex-col">
          <span class="font-medium">{props.order.buyer.name}</span>
          <span class="text-muted-foreground text-xs">{props.order.buyer.contact}</span>
        </div>
      </TableCell>
      <TableCell class="font-medium">{formatMoney(props.order.total)}</TableCell>
      <TableCell class="text-muted-foreground text-sm">
        {new Date(props.order.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <div class="flex flex-wrap justify-end gap-2">
          <For each={nextStatuses(props.order.status)}>
            {(status) => (
              <Button
                size="sm"
                variant={status === "cancelled" ? "destructive" : "default"}
                disabled={updateStatus.isPending}
                onClick={() => move(status)}
              >
                {transitionLabel(status)}
              </Button>
            )}
          </For>
          <Show when={props.config}>
            {(config) => (
              <EditLinesDialog slug={props.slug} order={props.order} config={config()} />
            )}
          </Show>
        </div>
      </TableCell>
    </TableRow>
  );
};
