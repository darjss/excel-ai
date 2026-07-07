import { useParams } from "@solidjs/router";
import { For, Match, Show, Switch } from "solid-js";
import { ManualOrderDialog } from "@/components/app/orders/ManualOrderDialog";
import { OrderRow } from "@/components/app/orders/OrderRow";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { queryErrorMessage } from "@/lib/api";
import { useSupplierConfig, useSupplierOrders } from "@/lib/queries/orders";

export const OrdersPage = () => {
  const params = useParams<{ slug: string }>();
  const slug = () => params.slug;
  const orders = useSupplierOrders(slug);
  const config = useSupplierConfig(slug);

  const rows = () => orders.data?.pages.flatMap((page) => page.orders) ?? [];

  return (
    <div class="mx-auto max-w-4xl">
      <div class="flex items-center justify-between gap-4">
        <div class="flex flex-col">
          <h1 class="text-2xl font-bold">Orders</h1>
          <p class="text-muted-foreground text-sm">{slug()}</p>
        </div>
        <Show when={config.data}>
          {(loaded) => <ManualOrderDialog slug={slug()} config={loaded()} />}
        </Show>
      </div>

      <Switch>
        <Match when={orders.isPending}>
          <p class="text-muted-foreground mt-6 text-sm">Loading…</p>
        </Match>
        <Match when={orders.isError}>
          <p class="text-destructive mt-6 text-sm">{queryErrorMessage(orders.error)}</p>
        </Match>
        <Match when={orders.data}>
          <div class="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead class="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <Show
                  when={rows().length > 0}
                  fallback={
                    <TableRow>
                      <TableCell colspan={5} class="text-muted-foreground py-8 text-center text-sm">
                        No orders yet.
                      </TableCell>
                    </TableRow>
                  }
                >
                  <For each={rows()}>
                    {(order) => <OrderRow slug={slug()} order={order} config={config.data} />}
                  </For>
                </Show>
              </TableBody>
            </Table>

            <Show when={orders.hasNextPage}>
              <div class="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={orders.isFetchingNextPage}
                  onClick={() => void orders.fetchNextPage()}
                >
                  {orders.isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              </div>
            </Show>
          </div>
        </Match>
      </Switch>
    </div>
  );
};
