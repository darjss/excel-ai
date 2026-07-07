import type { SectionProps } from "./HeroSection";

export const PaymentInstructionsSection = (props: SectionProps) => (
  <section class="flex flex-col gap-3 py-10">
    <h2
      class="text-2xl font-semibold"
      style={{ "font-family": "var(--portal-font-heading)" }}
    >
      Payment
    </h2>
    <p class="max-w-2xl text-[var(--portal-foreground)]/80">
      {props.config.business.paymentInstructions}
    </p>
  </section>
);
