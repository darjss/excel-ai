import { Show } from "solid-js";
import type { SectionProps } from "./HeroSection";

export const ContactSection = (props: SectionProps) => (
  <section class="flex flex-col gap-3 py-10">
    <h2
      class="text-2xl font-semibold"
      style={{ "font-family": "var(--portal-font-heading)" }}
    >
      Contact
    </h2>
    <dl class="flex flex-col gap-1 text-[var(--portal-foreground)]/80">
      <Show when={props.config.business.contact.email}>
        {(email) => <div>Email: {email()}</div>}
      </Show>
      <Show when={props.config.business.contact.phone}>
        {(phone) => <div>Phone: {phone()}</div>}
      </Show>
      <Show when={props.config.business.contact.address}>
        {(address) => <div>Address: {address()}</div>}
      </Show>
    </dl>
  </section>
);
