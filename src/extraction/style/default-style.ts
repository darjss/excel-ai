import type { PortalConfig, Section, Style } from "@/portal-config";
import { CURATED_PALETTES, paletteSeedText, pickPaletteKey } from "./palettes";

export const COPY_CAPS = { hero: 120, about: 400, cta: 40 } as const;

export const clampText = (text: string, max: number): string => {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const body = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return body.trim();
};

const defaultSections = (config: PortalConfig): Section[] => {
  const sections: Section[] = ["hero", "catalog", "order-form"];
  if (config.business.description !== undefined) sections.push("about");
  sections.push("payment-instructions");
  const { email, phone, address } = config.business.contact;
  if (email !== undefined || phone !== undefined || address !== undefined) sections.push("contact");
  return sections;
};

export const buildDefaultStyle = (config: PortalConfig): Style => {
  const curated = CURATED_PALETTES[pickPaletteKey(paletteSeedText(config))];
  const name = config.business.name.trim();
  const description = config.business.description?.trim();
  return {
    theme: {
      palette: curated.palette,
      radius: curated.radius,
      fontPairing: curated.fontPairing,
    },
    copy: {
      heroLine: clampText(description ?? `Order from ${name}, online.`, COPY_CAPS.hero),
      about: clampText(
        description ?? `Welcome to ${name}. Place your order directly through this portal.`,
        COPY_CAPS.about,
      ),
      orderCtaLabel: "Start your order",
      secondaryCtaLabel: "Browse the catalog",
    },
    sections: defaultSections(config),
  };
};
