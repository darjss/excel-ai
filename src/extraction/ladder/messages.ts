import type { NeedsHumanReason } from "./types";

export const WRONG_SPECIES_MESSAGE =
  "This doesn't look like an order form or price sheet — we couldn't find products, prices, or the columns that describe them. Start from a template built for exactly this and you'll be publishing in minutes.";

export const BUILDER_MODE_MESSAGE =
  "We found a table but weren't confident which part is your product list. Point us at it and name a few columns — we'll finish the rest.";

export const NEEDS_HUMAN_MESSAGE: Record<NeedsHumanReason, string> = {
  "too-large": "This workbook is larger than Sheetstand can process automatically right now. Send it to us and we'll take a look.",
  "too-many-sheets": "This workbook has more sheets than Sheetstand can untangle automatically yet. Send it to us and we'll take a look.",
  "macro-workbook": "This workbook runs on macros (VBA), which Sheetstand can't read yet. Send it to us and we'll take a look.",
  "unreadable": "We couldn't open this file — it may be password-protected or in a format we don't support yet. Send it to us and we'll take a look.",
  "no-draft": "We couldn't work out a portal from this sheet on our own. Send it to us and we'll take a look.",
  "unviable-after-hints": "Even with your guidance we couldn't build a confident portal from this sheet. Send it to us and we'll take a look.",
  "internal": "Something went wrong on our side while reading this workbook. Send it to us and we'll take a look.",
};

export interface TemplateOffer {
  id: string;
  name: string;
  description: string;
  href: string;
}

export const TEMPLATE_OFFERS: TemplateOffer[] = [
  {
    id: "order-form",
    name: "Order form template",
    description: "Products, quantities and a running total your buyers can fill in.",
    href: "/templates#order-form",
  },
  {
    id: "price-list",
    name: "Price list template",
    description: "A clean catalog of items and prices, ready to publish.",
    href: "/templates#price-list",
  },
];
