import type { Style } from "@/portal-config";

type Theme = Style["theme"];
type Radius = Theme["radius"];
type FontPairing = Theme["fontPairing"];

const radiusScale: Record<Radius, string> = {
  none: "0",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  full: "9999px",
};

const fontStacks: Record<FontPairing, { heading: string; body: string }> = {
  "inter-inter": {
    heading: '"Inter Variable", Inter, system-ui, sans-serif',
    body: '"Inter Variable", Inter, system-ui, sans-serif',
  },
  "fraunces-inter": {
    heading: 'Fraunces, Georgia, "Times New Roman", serif',
    body: '"Inter Variable", Inter, system-ui, sans-serif',
  },
  "playfair-inter": {
    heading: '"Playfair Display", Georgia, "Times New Roman", serif',
    body: '"Inter Variable", Inter, system-ui, sans-serif',
  },
  "space-grotesk-inter": {
    heading: '"Space Grotesk", system-ui, sans-serif',
    body: '"Inter Variable", Inter, system-ui, sans-serif',
  },
  "dm-serif-dm-sans": {
    heading: '"DM Serif Display", Georgia, "Times New Roman", serif',
    body: '"DM Sans", system-ui, sans-serif',
  },
};

export const portalThemeVars = (theme: Theme): Record<string, string> => ({
  "--portal-primary": theme.palette.primary,
  "--portal-accent": theme.palette.accent,
  "--portal-background": theme.palette.background,
  "--portal-foreground": theme.palette.foreground,
  "--portal-radius": radiusScale[theme.radius],
  "--portal-font-heading": fontStacks[theme.fontPairing].heading,
  "--portal-font-body": fontStacks[theme.fontPairing].body,
});

export const portalThemeStyleAttr = (theme: Theme): string =>
  Object.entries(portalThemeVars(theme))
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
