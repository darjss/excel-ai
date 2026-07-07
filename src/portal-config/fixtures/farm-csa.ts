import type { PortalConfig } from "../types";

export const farmCsaConfig: PortalConfig = {
  version: 1,
  templateFamily: "order-portal",
  business: {
    name: "Willow Creek Farm",
    description: "Seasonal vegetable shares and pasture-raised eggs from our family farm.",
    contact: {
      email: "hello@willowcreek.farm",
      phone: "+1 555 0177",
      address: "Willow Creek Farm, County Road 12",
    },
    paymentInstructions:
      "Pay for your share at pickup by cash or check. Season subscriptions can be paid in full by e-transfer.",
  },
  style: {
    theme: {
      palette: {
        primary: "#4a6b2a",
        accent: "#d98f3d",
        background: "#f8f6ee",
        foreground: "#26301a",
      },
      radius: "md",
      fontPairing: "dm-serif-dm-sans",
    },
    copy: {
      heroLine: "This week's harvest, straight from Willow Creek.",
      about: "We pick to order every Thursday. Reserve your share by Tuesday night.",
      orderCtaLabel: "Reserve your share",
    },
    sections: ["hero", "catalog", "order-form", "about", "contact", "payment-instructions"],
  },
  catalog: {
    categories: [
      { id: "spring", name: "Spring Harvest" },
      { id: "eggs", name: "Eggs & Dairy" },
    ],
    tables: [
      {
        id: "harvest",
        name: "Weekly Harvest",
        source: { sheet: "Harvest", range: "A1:D20" },
        fields: [
          {
            key: "name",
            label: "Item",
            type: "text",
            source: { sheet: "Harvest", range: "A2:A20" },
          },
          {
            key: "price",
            label: "Price",
            type: "currency",
            source: { sheet: "Harvest", range: "B2:B20" },
          },
          {
            key: "unit",
            label: "Unit",
            type: "text",
            source: { sheet: "Harvest", range: "C2:C20" },
          },
          {
            key: "limit",
            label: "Weekly Limit",
            type: "quantity",
            source: { sheet: "Harvest", range: "D2:D20" },
          },
        ],
        products: [
          {
            id: "asparagus-bunch",
            name: "Asparagus",
            categoryId: "spring",
            unit: "bunch",
            unitPrice: { currencyCode: "USD", amount: 450 },
            attributes: [{ fieldKey: "weeklyLimit", value: 6 }],
            source: { sheet: "Harvest", range: "A2:D2" },
          },
          {
            id: "salad-mix-bag",
            name: "Salad Mix",
            categoryId: "spring",
            unit: "bag",
            unitPrice: { currencyCode: "USD", amount: 550 },
            attributes: [{ fieldKey: "weeklyLimit", value: 4 }],
            source: { sheet: "Harvest", range: "A3:D3" },
          },
          {
            id: "eggs-dozen",
            name: "Pasture Eggs",
            categoryId: "eggs",
            unit: "dozen",
            unitPrice: { currencyCode: "USD", amount: 700 },
            attributes: [{ fieldKey: "weeklyLimit", value: 3 }],
            source: { sheet: "Harvest", range: "A4:D4" },
          },
        ],
      },
    ],
  },
  rules: [
    {
      id: "line-total",
      type: "line-total",
      plainEnglish: "Line cost is the item price times the quantity reserved.",
      source: { sheet: "Order", range: "E2", formula: "=B2*D2" },
    },
    {
      id: "eggs-limit",
      type: "order-minimum",
      plainEnglish: "Egg share is limited; the sheet flags orders over 3 dozen per week.",
      source: { sheet: "Harvest", range: "E4", formula: '=IF(D4>3,"Over limit","OK")' },
      scope: { target: "product", productId: "eggs-dozen" },
      basis: "quantity",
      threshold: 1,
    },
  ],
  validations: [
    {
      id: "name-required",
      kind: "required",
      field: { tableId: "harvest", fieldKey: "buyerName" },
    },
    {
      id: "pickup-enum",
      kind: "enum",
      field: { tableId: "harvest", fieldKey: "pickupDay" },
      allowed: ["Thursday", "Saturday"],
      source: { sheet: "Pickup", range: "A2:A3" },
    },
  ],
  findings: [
    {
      id: "f-harvest",
      confidence: "high",
      plainEnglish: "Found a weekly harvest list of 3 items across spring and eggs.",
      accepted: true,
    },
    {
      id: "f-limits",
      confidence: "low",
      plainEnglish: "A 'Weekly Limit' column may cap how much of each item a Buyer can reserve.",
      question: "Should the weekly limit block orders, or is it just a planning note?",
      accepted: false,
    },
    {
      id: "f-pickup",
      confidence: "medium",
      plainEnglish: "Pickup days appear restricted to Thursday and Saturday.",
      accepted: true,
    },
  ],
};
