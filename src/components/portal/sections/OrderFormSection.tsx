import { portalHref } from "../paths";
import type { SectionProps } from "./HeroSection";

export const OrderFormSection = (props: SectionProps) => (
  <section class="flex flex-col items-start gap-3 py-10">
    <h2
      class="text-2xl font-semibold"
      style={{ "font-family": "var(--portal-font-heading)" }}
    >
      Place an order
    </h2>
    <p class="max-w-2xl text-[var(--portal-foreground)]/80">
      Build your order from the catalog and submit it to {props.config.business.name}.
    </p>
    <a
      class="rounded-[var(--portal-radius)] bg-[var(--portal-primary)] px-6 py-3 font-medium text-[var(--portal-background)]"
      href={portalHref(props.basePath, "/order")}
    >
      {props.config.style.copy.orderCtaLabel}
    </a>
  </section>
);
