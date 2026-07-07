import * as v from "valibot";
import { hexColor, nonEmptyText } from "./primitives";

export const paletteSchema = v.object({
  primary: hexColor,
  accent: hexColor,
  background: hexColor,
  foreground: hexColor,
});

export const radius = v.picklist(["none", "sm", "md", "lg", "full"]);

export const fontPairing = v.picklist([
  "inter-inter",
  "fraunces-inter",
  "playfair-inter",
  "space-grotesk-inter",
  "dm-serif-dm-sans",
]);

export const themeSchema = v.object({
  palette: paletteSchema,
  radius,
  fontPairing,
});

export const copySchema = v.object({
  heroLine: nonEmptyText,
  about: nonEmptyText,
  orderCtaLabel: nonEmptyText,
  secondaryCtaLabel: v.optional(nonEmptyText),
});

export const section = v.picklist([
  "hero",
  "catalog",
  "order-form",
  "about",
  "contact",
  "payment-instructions",
]);

export const styleSchema = v.object({
  theme: themeSchema,
  copy: copySchema,
  sections: v.pipe(v.array(section), v.minLength(1)),
});

export type Palette = v.InferOutput<typeof paletteSchema>;
export type Style = v.InferOutput<typeof styleSchema>;
export type Section = v.InferOutput<typeof section>;
