import { For } from "solid-js";

const OFFERS = [
  {
    id: "order-form",
    name: "Order form template",
    description: "Products, quantities and a running total your buyers can fill in.",
    href: "/templates#order-form",
  },
  {
    id: "price-list",
    name: "Price list template",
    description: "A clean catalog of items and prices, ready to publish.",
    href: "/templates#price-list",
  },
];

export const WrongSpecies = (props: { message: string }) => (
  <div class="mx-auto max-w-2xl py-20">
    <h1 class="text-3xl font-semibold tracking-tight">This isn't an order sheet — yet</h1>
    <p class="text-muted-foreground mt-4 text-lg">{props.message}</p>
    <div class="mt-10 grid gap-4 sm:grid-cols-2">
      <For each={OFFERS}>
        {(offer) => (
          <a
            href={offer.href}
            class="border-border hover:border-primary bg-card block rounded-xl border p-6 transition-colors"
          >
            <h2 class="font-medium">{offer.name}</h2>
            <p class="text-muted-foreground mt-2 text-sm">{offer.description}</p>
            <span class="text-primary mt-4 inline-block text-sm font-medium">Start from this →</span>
          </a>
        )}
      </For>
    </div>
  </div>
);
