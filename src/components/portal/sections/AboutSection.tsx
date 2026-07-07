import { Show } from "solid-js";
import type { SectionProps } from "./HeroSection";

export const AboutSection = (props: SectionProps) => (
  <section class="flex flex-col gap-3 py-10">
    <h2
      class="text-2xl font-semibold"
      style={{ "font-family": "var(--portal-font-heading)" }}
    >
      About
    </h2>
    <p class="max-w-2xl text-[var(--portal-foreground)]/80">{props.config.style.copy.about}</p>
    <Show when={props.config.business.description}>
      {(description) => (
        <p class="max-w-2xl text-[var(--portal-foreground)]/70">{description()}</p>
      )}
    </Show>
  </section>
);
