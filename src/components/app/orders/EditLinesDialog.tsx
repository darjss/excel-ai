import { createSignal, Show } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { toast } from "solid-sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { queryErrorMessage } from "@/lib/api";
import { useEditOrderLines } from "@/lib/queries/orders";
import type { PortalConfig } from "@/portal-config";
import type { Order } from "@/server/orders/order";
import { LineEditor } from "./LineEditor";

interface EditLinesDialogProps {
  slug: string;
  order: Order;
  config: PortalConfig;
}

export const EditLinesDialog = (props: EditLinesDialogProps) => {
  const editLines = useEditOrderLines(() => props.slug);
  const [open, setOpen] = createSignal(false);
  const [quantities, setQuantities] = createStore<Record<string, number>>({});

  const seed = () => {
    const next: Record<string, number> = {};
    for (const line of props.order.lines) next[line.productId] = line.quantity;
    setQuantities(reconcile(next));
  };

  const lines = () =>
    Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

  const save = () => {
    const next = lines();
    if (next.length === 0) {
      toast.error("Keep at least one line, or cancel the order instead.");
      return;
    }
    editLines.mutate(
      { id: props.order.id, lines: next },
      {
        onSuccess: () => {
          toast.success("Order lines updated.");
          setOpen(false);
        },
        onError: (error) => toast.error(queryErrorMessage(error)),
      },
    );
  };

  return (
    <Dialog
      open={open()}
      onOpenChange={(next) => {
        if (next) seed();
        setOpen(next);
      }}
    >
      <DialogTrigger as={Button} variant="outline" size="sm">
        Edit lines
      </DialogTrigger>
      <DialogContent class="max-w-lg border bg-background p-6">
        <DialogHeader>
          <DialogTitle>Edit order {props.order.id}</DialogTitle>
        </DialogHeader>
        <div class="mt-4">
          <LineEditor
            config={props.config}
            quantityFor={(productId) => quantities[productId] ?? 0}
            setQuantity={(productId, quantity) => setQuantities(productId, quantity)}
          />
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={editLines.isPending}>
            <Show when={editLines.isPending} fallback="Save changes">
              Saving…
            </Show>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
