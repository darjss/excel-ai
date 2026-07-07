import type { PortalConfig } from "../types";

export const bakeryConfig: PortalConfig = {
  version: 1,
  templateFamily: "order-portal",
  business: {
    name: "Rosewater Bakery",
    description: "Small-batch sourdough and pastries, baked fresh every morning.",
    contact: {
      email: "orders@rosewaterbakery.co",
      phone: "+1 555 0142",
      address: "18 Mill Lane, Ashford",
    },
    paymentInstructions:
      "Pay on collection by cash or card. Wholesale accounts are invoiced weekly, net 7 days.",
  },
  style: {
    theme: {
      palette: {
        primary: "#8a5a44",
        accent: "#e0b589",
        background: "#fdf7f0",
        foreground: "#2c1e16",
      },
      radius: "lg",
      fontPairing: "fraunces-inter",
    },
    copy: {
      heroLine: "Fresh sourdough, ordered the night before.",
      about: "We bake in small batches, so order ahead to reserve your loaves.",
      orderCtaLabel: "Place your order",
      secondaryCtaLabel: "See this week's bakes",
    },
    sections: ["hero", "catalog", "order-form", "about", "payment-instructions"],
  },
  catalog: {
    categories: [
      { id: "breads", name: "Breads" },
      { id: "pastries", name: "Pastries" },
    ],
    tables: [
      {
        id: "menu",
        name: "Weekly Menu",
        source: { sheet: "Menu", range: "A1:C12" },
        fields: [
          { key: "name", label: "Item", type: "text", source: { sheet: "Menu", range: "A2:A12" } },
          {
            key: "price",
            label: "Price",
            type: "currency",
            source: { sheet: "Menu", range: "B2:B12" },
          },
          { key: "unit", label: "Unit", type: "text", source: { sheet: "Menu", range: "C2:C12" } },
        ],
        products: [
          {
            id: "sourdough-classic",
            name: "Classic Sourdough",
            categoryId: "breads",
            unit: "loaf",
            unitPrice: { currencyCode: "USD", amount: 650 },
            attributes: [],
            source: { sheet: "Menu", range: "A2:C2" },
          },
          {
            id: "rye-loaf",
            name: "Dark Rye",
            categoryId: "breads",
            unit: "loaf",
            unitPrice: { currencyCode: "USD", amount: 700 },
            attributes: [],
            source: { sheet: "Menu", range: "A3:C3" },
          },
          {
            id: "butter-croissant",
            name: "Butter Croissant",
            categoryId: "pastries",
            unit: "each",
            unitPrice: { currencyCode: "USD", amount: 375 },
            attributes: [],
            source: { sheet: "Menu", range: "A4:C4" },
          },
        ],
      },
    ],
  },
  rules: [
    {
      id: "line-total",
      type: "line-total",
      plainEnglish: "Each line costs the item price times the quantity ordered.",
      source: { sheet: "Menu", range: "D2", formula: "=B2*C2" },
    },
    {
      id: "min-order",
      type: "order-minimum",
      plainEnglish: "Orders must total at least $20 before collection.",
      source: { sheet: "Menu", range: "B15", formula: '=IF(SUM(D2:D12)<20,"Below minimum","OK")' },
      scope: { target: "all" },
      basis: "subtotal",
      threshold: { currencyCode: "USD", amount: 2000 },
    },
  ],
  validations: [
    {
      id: "qty-required",
      kind: "required",
      field: { tableId: "menu", fieldKey: "quantity" },
    },
  ],
  findings: [
    {
      id: "f-catalog",
      confidence: "high",
      plainEnglish: "Found a weekly menu of 3 items with prices per unit.",
      accepted: true,
    },
    {
      id: "f-min-order",
      targetRef: { kind: "rule", id: "min-order" },
      confidence: "medium",
      plainEnglish: "A $20 order minimum appears to apply to the whole order.",
      question: "Does the $20 minimum apply to every order, or only wholesale?",
      accepted: false,
    },
  ],
};
