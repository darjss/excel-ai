import * as v from "valibot";
import { hexColor, nonEmptyText } from "./primitives";

export const paletteSchema = v.strictObject({
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

export const themeSchema = v.strictObject({
  palette: paletteSchema,
  radius,
  fontPairing,
});

export const copySchema = v.strictObject({
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

const sectionsUnique = (sections: Section[]): boolean => new Set(sections).size === sections.length;

export const styleSchema = v.strictObject({
  theme: themeSchema,
  copy: copySchema,
  sections: v.pipe(
    v.array(section),
    v.minLength(1),
    v.check(sectionsUnique, "Sections must not contain duplicate entries"),
  ),
});

export type Palette = v.InferOutput<typeof paletteSchema>;
export type Style = v.InferOutput<typeof styleSchema>;
export type Section = v.InferOutput<typeof section>;
