import { Show } from "solid-js";
import type { Product } from "@/portal-config";
import { formatMoney } from "./money";

export interface ProductCardProps {
  product: Product;
  categoryName?: string;
}

export const ProductCard = (props: ProductCardProps) => (
  <article class="flex flex-col gap-1 rounded-[var(--portal-radius)] border border-[var(--portal-foreground)]/10 p-4">
    <div class="flex items-baseline justify-between gap-3">
      <h3
        class="font-medium"
        style={{ "font-family": "var(--portal-font-heading)" }}
      >
        {props.product.name}
      </h3>
      <span class="font-semibold text-[var(--portal-primary)]">
        {formatMoney(props.product.unitPrice)}
        <Show when={props.product.unit}>
          <span class="text-[var(--portal-foreground)]/50"> / {props.product.unit}</span>
        </Show>
      </span>
    </div>
    <Show when={props.categoryName}>
      <span class="text-xs uppercase tracking-wide text-[var(--portal-foreground)]/50">
        {props.categoryName}
      </span>
    </Show>
    <Show when={props.product.sku}>
      <span class="text-xs text-[var(--portal-foreground)]/50">SKU {props.product.sku}</span>
    </Show>
  </article>
);
