import Minus from "lucide-solid/icons/minus";
import Plus from "lucide-solid/icons/plus";
import { createMemo, For, Show } from "solid-js";
import { catalogProducts } from "@/components/portal/catalog-data";
import { formatMoney } from "@/components/portal/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_LINE_QUANTITY } from "@/lib/order-limits";
import type { PortalConfig } from "@/portal-config";
import type { CartLineInput } from "@/server/orders/compute";
import { computeTotals } from "@/server/orders/compute";

interface LineEditorProps {
  config: PortalConfig;
  quantityFor: (productId: string) => number;
  setQuantity: (productId: string, quantity: number) => void;
}

export const LineEditor = (props: LineEditorProps) => {
  const products = createMemo(() => catalogProducts(props.config));

  const cartLines = createMemo<CartLineInput[]>(() =>
    products()
      .filter((product) => props.quantityFor(product.id) > 0)
      .map((product) => ({
        productId: product.id,
        name: product.name,
        unit: product.unit,
        categoryId: product.categoryId,
        unitPrice: product.unitPrice,
        quantity: props.quantityFor(product.id),
      })),
  );

  const totals = createMemo(() => computeTotals(props.config.rules, { lines: cartLines() }));

  const step = (productId: string, delta: number) =>
    props.setQuantity(
      productId,
      Math.min(MAX_LINE_QUANTITY, Math.max(0, props.quantityFor(productId) + delta)),
    );

  return (
    <div class="flex flex-col gap-4">
      <div class="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
        <For each={products()}>
          {(product) => (
            <div class="flex items-center justify-between gap-3 rounded-md border p-3">
              <div class="flex flex-col">
                <span class="text-sm font-medium">{product.name}</span>
                <span class="text-muted-foreground text-xs">
                  {formatMoney(product.unitPrice)}
                  <Show when={product.unit}> / {product.unit}</Show>
                </span>
              </div>
              <div class="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Decrease ${product.name}`}
                  onClick={() => step(product.id, -1)}
                >
                  <Minus class="size-4" />
                </Button>
                <Input
                  type="number"
                  min="0"
                  inputmode="numeric"
                  aria-label={`Quantity of ${product.name}`}
                  class="h-8 w-16 text-center"
                  value={props.quantityFor(product.id)}
                  onInput={(event) =>
                    props.setQuantity(product.id, Math.trunc(Number(event.currentTarget.value)))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Increase ${product.name}`}
                  onClick={() => step(product.id, 1)}
                >
                  <Plus class="size-4" />
                </Button>
              </div>
            </div>
          )}
        </For>
      </div>

      <div class="flex flex-col gap-1 rounded-md border p-3 text-sm">
        <div class="flex justify-between">
          <span class="text-muted-foreground">Subtotal</span>
          <span class="font-medium">{formatMoney(totals().subtotal)}</span>
        </div>
        <Show when={totals().tax}>
          {(tax) => (
            <div class="flex justify-between">
              <span class="text-muted-foreground">Tax</span>
              <span class="font-medium">{formatMoney(tax())}</span>
            </div>
          )}
        </Show>
        <div class="flex justify-between border-t pt-1">
          <span class="font-semibold">Total</span>
          <span class="font-semibold">{formatMoney(totals().total)}</span>
        </div>
      </div>

      <Show when={totals().violations.length > 0}>
        <ul class="text-destructive flex flex-col gap-1 text-sm">
          <For each={totals().violations}>{(violation) => <li>{violation.message}</li>}</For>
        </ul>
      </Show>
    </div>
  );
};
