import { Show } from "solid-js";
import type { PortalConfig } from "@/portal-config";
import { portalHref } from "../paths";

export interface SectionProps {
  config: PortalConfig;
  basePath: string;
}

export const HeroSection = (props: SectionProps) => (
  <section class="flex flex-col items-start gap-5 py-16">
    <h1
      class="text-4xl font-bold tracking-tight md:text-6xl"
      style={{ "font-family": "var(--portal-font-heading)" }}
    >
      {props.config.business.name}
    </h1>
    <p class="max-w-2xl text-lg text-[var(--portal-foreground)]/80">
      {props.config.style.copy.heroLine}
    </p>
    <div class="flex flex-wrap gap-3">
      <a
        class="rounded-[var(--portal-radius)] bg-[var(--portal-primary)] px-6 py-3 font-medium text-[var(--portal-background)]"
        href={portalHref(props.basePath, "/order")}
      >
        {props.config.style.copy.orderCtaLabel}
      </a>
      <Show when={props.config.style.copy.secondaryCtaLabel}>
        {(label) => (
          <a
            class="rounded-[var(--portal-radius)] border border-[var(--portal-primary)] px-6 py-3 font-medium text-[var(--portal-primary)]"
            href={portalHref(props.basePath, "/catalog")}
          >
            {label()}
          </a>
        )}
      </Show>
    </div>
  </section>
);
