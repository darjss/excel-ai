import Plus from "lucide-solid/icons/plus";
import { createSignal, Show } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { toast } from "solid-sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryErrorMessage } from "@/lib/api";
import { useCreateManualOrder } from "@/lib/queries/orders";
import type { PortalConfig } from "@/portal-config";
import { LineEditor } from "./LineEditor";

interface ManualOrderDialogProps {
  slug: string;
  config: PortalConfig;
}

export const ManualOrderDialog = (props: ManualOrderDialogProps) => {
  const createOrder = useCreateManualOrder(() => props.slug);
  const [open, setOpen] = createSignal(false);
  const [name, setName] = createSignal("");
  const [contact, setContact] = createSignal("");
  const [quantities, setQuantities] = createStore<Record<string, number>>({});

  const reset = () => {
    setName("");
    setContact("");
    setQuantities(reconcile({}));
  };

  const lines = () =>
    Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

  const submit = () => {
    const orderLines = lines();
    if (!name().trim() || !contact().trim()) {
      toast.error("Enter the buyer's name and contact.");
      return;
    }
    if (orderLines.length === 0) {
      toast.error("Add at least one product.");
      return;
    }
    createOrder.mutate(
      { buyer: { name: name().trim(), contact: contact().trim() }, lines: orderLines },
      {
        onSuccess: () => {
          toast.success("Manual order created.");
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
        if (next) reset();
        setOpen(next);
      }}
    >
      <DialogTrigger as={Button} size="sm">
        <Plus class="size-4" />
        New manual order
      </DialogTrigger>
      <DialogContent class="max-w-lg border bg-background p-6">
        <DialogHeader>
          <DialogTitle>New manual order</DialogTitle>
        </DialogHeader>
        <div class="mt-4 flex flex-col gap-4">
          <div class="flex flex-col gap-3 sm:flex-row">
            <div class="flex-1">
              <Label for="manual-name">Buyer name</Label>
              <Input
                id="manual-name"
                value={name()}
                onInput={(event) => setName(event.currentTarget.value)}
                placeholder="Phone or walk-in buyer"
              />
            </div>
            <div class="flex-1">
              <Label for="manual-contact">Email or phone</Label>
              <Input
                id="manual-contact"
                value={contact()}
                onInput={(event) => setContact(event.currentTarget.value)}
                placeholder="+1 555 0000"
              />
            </div>
          </div>
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
          <Button onClick={submit} disabled={createOrder.isPending}>
            <Show when={createOrder.isPending} fallback="Create order">
              Creating…
            </Show>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
