import type { Palette, PortalConfig, Style } from "@/portal-config";

export type PaletteKey = "bakery-warm" | "farm-green" | "wholesale-navy" | "neutral";

type Theme = Style["theme"];

export interface CuratedPalette {
  palette: Palette;
  fontPairing: Theme["fontPairing"];
  radius: Theme["radius"];
}

export const PALETTE_KEYS: PaletteKey[] = ["bakery-warm", "farm-green", "wholesale-navy", "neutral"];

export const CURATED_PALETTES: Record<PaletteKey, CuratedPalette> = {
  "bakery-warm": {
    palette: { primary: "#8a5a44", accent: "#e0b589", background: "#fdf7f0", foreground: "#2c1e16" },
    fontPairing: "fraunces-inter",
    radius: "lg",
  },
  "farm-green": {
    palette: { primary: "#3f6f3a", accent: "#a7c957", background: "#f4f7ee", foreground: "#1e2a17" },
    fontPairing: "dm-serif-dm-sans",
    radius: "md",
  },
  "wholesale-navy": {
    palette: { primary: "#1f3a5f", accent: "#4a90c2", background: "#f5f7fa", foreground: "#131c28" },
    fontPairing: "space-grotesk-inter",
    radius: "sm",
  },
  neutral: {
    palette: { primary: "#2b2b2b", accent: "#6b7280", background: "#ffffff", foreground: "#111827" },
    fontPairing: "inter-inter",
    radius: "md",
  },
};

const KEYWORD_MAP: { key: PaletteKey; pattern: RegExp }[] = [
  { key: "bakery-warm", pattern: /bak(?:e|ery|ing)|bread|pastry|patisserie|cafe|coffee|dessert|cake/i },
  { key: "farm-green", pattern: /farm|produce|organic|grocer|csa|garden|orchard|dairy|harvest|butcher/i },
  { key: "wholesale-navy", pattern: /wholesale|distribut|supply|supplier|trade|provision|industrial|logistics/i },
];

export const paletteSeedText = (config: PortalConfig): string =>
  [
    config.business.name,
    config.business.description ?? "",
    ...config.catalog.categories.map((category) => category.name),
    ...config.catalog.tables.map((table) => table.name),
  ].join(" ");

export const pickPaletteKey = (text: string): PaletteKey => {
  for (const entry of KEYWORD_MAP) {
    if (entry.pattern.test(text)) return entry.key;
  }
  return "neutral";
};
