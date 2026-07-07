import * as v from "valibot";
import { copySchema, fontPairing, type PortalConfig, radius, type Section, section } from "@/portal-config";
import { PALETTE_KEYS, type PaletteKey, paletteSeedText, pickPaletteKey } from "./palettes";

export const paletteKeySchema = v.picklist(PALETTE_KEYS);

const sectionsUnique = (sections: Section[]): boolean => new Set(sections).size === sections.length;

const CORE_SECTIONS: Section[] = ["hero", "catalog", "order-form"];

const sectionsHaveCore = (sections: Section[]): boolean =>
  CORE_SECTIONS.every((core) => sections.includes(core));

export const stylePickSchema = v.strictObject({
  paletteKey: paletteKeySchema,
  radius,
  fontPairing,
  copy: copySchema,
  sections: v.pipe(
    v.array(section),
    v.minLength(1),
    v.check(sectionsUnique, "Sections must not contain duplicate entries"),
    v.check(sectionsHaveCore, 'Sections must include "hero", "catalog" and "order-form"'),
  ),
});

export type StylePick = v.InferOutput<typeof stylePickSchema>;

export interface StyleSeed {
  name: string;
  description?: string;
  categories: string[];
  tables: string[];
  paymentInstructions: string;
  suggestedPaletteKey: PaletteKey;
}

export const buildSeed = (config: PortalConfig): StyleSeed => ({
  name: config.business.name,
  ...(config.business.description !== undefined ? { description: config.business.description } : {}),
  categories: config.catalog.categories.map((category) => category.name),
  tables: config.catalog.tables.map((table) => table.name),
  paymentInstructions: config.business.paymentInstructions,
  suggestedPaletteKey: pickPaletteKey(paletteSeedText(config)),
});

export const STYLE_SYSTEM_PROMPT = `You are the Sheetstand brand designer. You choose a look and write the customer-facing copy for a supplier's order portal, working only within a fixed set of options. You never write code, CSS or hex colours.

Return ONLY a JSON object, no prose, with exactly this shape:
{
  "paletteKey": one of "bakery-warm" | "farm-green" | "wholesale-navy" | "neutral",
  "radius": one of "none" | "sm" | "md" | "lg" | "full",
  "fontPairing": one of "inter-inter" | "fraunces-inter" | "playfair-inter" | "space-grotesk-inter" | "dm-serif-dm-sans",
  "copy": {
    "heroLine": short headline (<= 120 chars),
    "about": one or two sentences about the business (<= 400 chars),
    "orderCtaLabel": button label such as "Start your order" (<= 40 chars),
    "secondaryCtaLabel": optional secondary button label (<= 40 chars)
  },
  "sections": ordered subset of ["hero","catalog","order-form","about","contact","payment-instructions"] with no duplicates
}

Rules:
- Pick the paletteKey that best fits the business; a suggestion is provided but override it if another fits better.
- Copy is plain text only, warm and concrete, matched to the business. No HTML, markdown or emoji. No claims you cannot support from the context (no fake awards, years in business or testimonials).
- Always include "hero", "catalog" and "order-form" in sections. Add "about", "contact" or "payment-instructions" only when there is real content for them.`;

const line = (label: string, value: string): string => `${label}: ${value}`;

export const renderStylePrompt = (seed: StyleSeed): string => {
  const lines: string[] = [
    "# Business context",
    line("Name", seed.name),
    line("Suggested palette", seed.suggestedPaletteKey),
  ];
  if (seed.description !== undefined) lines.push(line("Description", seed.description));
  if (seed.categories.length > 0) lines.push(line("Product categories", seed.categories.join(", ")));
  if (seed.tables.length > 0) lines.push(line("Catalog tables", seed.tables.join(", ")));
  lines.push(line("Payment instructions", seed.paymentInstructions));
  lines.push("", "Return the style JSON now.");
  return lines.join("\n");
};

export const extractStyleJson = (text: string): unknown => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) return {};
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return {};
  }
};
