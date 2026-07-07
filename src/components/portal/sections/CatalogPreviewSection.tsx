import { For, Show } from "solid-js";
import { catalogProducts, categoryNames } from "../catalog-data";
import { portalHref } from "../paths";
import { ProductCard } from "../ProductCard";
import type { SectionProps } from "./HeroSection";

const previewLimit = 6;

export const CatalogPreviewSection = (props: SectionProps) => {
  const names = categoryNames(props.config);
  const preview = catalogProducts(props.config).slice(0, previewLimit);

  return (
    <section class="flex flex-col gap-5 py-10">
      <div class="flex items-baseline justify-between gap-4">
        <h2
          class="text-2xl font-semibold"
          style={{ "font-family": "var(--portal-font-heading)" }}
        >
          Catalog
        </h2>
        <a class="text-sm text-[var(--portal-primary)]" href={portalHref(props.basePath, "/catalog")}>
          Browse full catalog
        </a>
      </div>
      <Show
        when={preview.length > 0}
        fallback={<p class="text-[var(--portal-foreground)]/60">No products listed yet.</p>}
      >
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <For each={preview}>
            {(product) => (
              <ProductCard
                product={product}
                categoryName={product.categoryId ? names.get(product.categoryId) : undefined}
              />
            )}
          </For>
        </div>
      </Show>
    </section>
  );
};
