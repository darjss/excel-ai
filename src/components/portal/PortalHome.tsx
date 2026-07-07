import { For, type JSX } from "solid-js";
import type { PortalConfig, Section } from "@/portal-config";
import { assertNever } from "./paths";
import { AboutSection } from "./sections/AboutSection";
import { CatalogPreviewSection } from "./sections/CatalogPreviewSection";
import { ContactSection } from "./sections/ContactSection";
import { HeroSection } from "./sections/HeroSection";
import { OrderFormSection } from "./sections/OrderFormSection";
import { PaymentInstructionsSection } from "./sections/PaymentInstructionsSection";

export interface PortalHomeProps {
  config: PortalConfig;
  basePath: string;
}

const renderSection = (section: Section, config: PortalConfig, basePath: string): JSX.Element => {
  switch (section) {
    case "hero":
      return <HeroSection config={config} basePath={basePath} />;
    case "catalog":
      return <CatalogPreviewSection config={config} basePath={basePath} />;
    case "order-form":
      return <OrderFormSection config={config} basePath={basePath} />;
    case "about":
      return <AboutSection config={config} basePath={basePath} />;
    case "contact":
      return <ContactSection config={config} basePath={basePath} />;
    case "payment-instructions":
      return <PaymentInstructionsSection config={config} basePath={basePath} />;
    default:
      return assertNever(section);
  }
};

export const PortalHome = (props: PortalHomeProps) => (
  <For each={props.config.style.sections}>
    {(section) => renderSection(section, props.config, props.basePath)}
  </For>
);
