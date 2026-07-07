import { createMemo, createSignal, For, Show } from "solid-js";
import type { PortalConfig } from "@/portal-config";
import { catalogProducts, categoryNames, matchesQuery } from "./catalog-data";
import { ProductCard } from "./ProductCard";

export interface CatalogProps {
  config: PortalConfig;
}

export const Catalog = (props: CatalogProps) => {
  const [query, setQuery] = createSignal("");

  const categories = createMemo(() => categoryNames(props.config));
  const products = createMemo(() => catalogProducts(props.config));

  const filtered = createMemo(() => {
    const names = categories();
    const current = query();
    return products().filter((product) =>
      matchesQuery(product, product.categoryId ? names.get(product.categoryId) : undefined, current),
    );
  });

  return (
    <section class="flex flex-col gap-6 py-10">
      <div class="flex flex-col gap-2">
        <h1
          class="text-3xl font-bold"
          style={{ "font-family": "var(--portal-font-heading)" }}
        >
          Catalog
        </h1>
        <input
          type="search"
          value={query()}
          onInput={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search products"
          aria-label="Search products"
          class="w-full max-w-sm rounded-[var(--portal-radius)] border border-[var(--portal-foreground)]/20 bg-transparent px-4 py-2 text-[var(--portal-foreground)]"
        />
      </div>

      <Show
        when={filtered().length > 0}
        fallback={<p class="text-[var(--portal-foreground)]/60">No products match your search.</p>}
      >
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <For each={filtered()}>
            {(product) => (
              <ProductCard
                product={product}
                categoryName={
                  product.categoryId ? categories().get(product.categoryId) : undefined
                }
              />
            )}
          </For>
        </div>
      </Show>
    </section>
  );
};
