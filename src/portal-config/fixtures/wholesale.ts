import type { PortalConfig } from "../types";

export const wholesaleConfig: PortalConfig = {
  version: 1,
  templateFamily: "order-portal",
  business: {
    name: "Northgate Provisions",
    description: "Wholesale dry goods and pantry staples for cafes and restaurants.",
    contact: {
      email: "trade@northgateprovisions.com",
      phone: "+1 555 0199",
      address: "Unit 4, Dockside Trade Park",
    },
    paymentInstructions:
      "Trade accounts invoiced on delivery, net 30. Bank transfer to Northgate Provisions Ltd, sort 20-00-00, acct 12345678.",
  },
  style: {
    theme: {
      palette: {
        primary: "#1f3a5f",
        accent: "#3f9d6c",
        background: "#f4f6f8",
        foreground: "#141c26",
      },
      radius: "sm",
      fontPairing: "space-grotesk-inter",
    },
    copy: {
      heroLine: "Pantry staples, priced by the case.",
      about: "Better prices the more you buy. Order by the case and we deliver twice a week.",
      orderCtaLabel: "Build your order",
      secondaryCtaLabel: "Download price list",
    },
    sections: ["hero", "catalog", "order-form", "payment-instructions", "contact"],
  },
  catalog: {
    categories: [
      { id: "grains", name: "Grains & Flour" },
      { id: "oils", name: "Oils & Vinegars" },
      { id: "canned", name: "Canned Goods" },
    ],
    tables: [
      {
        id: "pricelist",
        name: "Trade Price List",
        source: { sheet: "PriceList", range: "A1:E40" },
        fields: [
          {
            key: "sku",
            label: "SKU",
            type: "sku",
            source: { sheet: "PriceList", range: "A2:A40" },
          },
          {
            key: "name",
            label: "Product",
            type: "text",
            source: { sheet: "PriceList", range: "B2:B40" },
          },
          {
            key: "category",
            label: "Category",
            type: "category",
            source: { sheet: "PriceList", range: "C2:C40" },
          },
          {
            key: "case",
            label: "Case Price",
            type: "currency",
            source: { sheet: "PriceList", range: "D2:D40" },
          },
        ],
        products: [
          {
            id: "flour-00-25kg",
            name: "Tipo 00 Flour 25kg",
            categoryId: "grains",
            sku: "GRN-0025",
            unit: "case",
            unitPrice: { currencyCode: "USD", amount: 4200 },
            attributes: [{ fieldKey: "packSize", value: "1 x 25kg" }],
            source: { sheet: "PriceList", range: "A2:D2" },
          },
          {
            id: "olive-oil-5l",
            name: "Extra Virgin Olive Oil 5L",
            categoryId: "oils",
            sku: "OIL-0050",
            unit: "case",
            unitPrice: { currencyCode: "USD", amount: 6800 },
            attributes: [{ fieldKey: "packSize", value: "4 x 5L" }],
            source: { sheet: "PriceList", range: "A3:D3" },
          },
          {
            id: "tomatoes-tin-12",
            name: "Peeled Plum Tomatoes 12x400g",
            categoryId: "canned",
            sku: "CAN-0120",
            unit: "case",
            unitPrice: { currencyCode: "USD", amount: 1650 },
            attributes: [{ fieldKey: "packSize", value: "12 x 400g" }],
            source: { sheet: "PriceList", range: "A4:D4" },
          },
        ],
      },
    ],
  },
  rules: [
    {
      id: "line-total",
      type: "line-total",
      plainEnglish: "Line cost is the case price multiplied by the number of cases.",
      source: { sheet: "Order", range: "E2", formula: "=D2*C2" },
    },
    {
      id: "tier-flour",
      type: "tier-pricing",
      plainEnglish: "Tipo 00 Flour drops to $40/case at 10 cases and $38/case at 25 cases.",
      source: { sheet: "PriceList", range: "F2", formula: "=IF(C2>=25,38,IF(C2>=10,40,42))" },
      scope: { target: "product", productId: "flour-00-25kg" },
      tiers: [
        { minQuantity: 1, unitPrice: { currencyCode: "USD", amount: 4200 } },
        { minQuantity: 10, unitPrice: { currencyCode: "USD", amount: 4000 } },
        { minQuantity: 25, unitPrice: { currencyCode: "USD", amount: 3800 } },
      ],
    },
    {
      id: "min-order-grains",
      type: "order-minimum",
      plainEnglish: "Grain orders require a minimum of 5 cases.",
      source: { sheet: "Order", range: "G1", formula: '=IF(SUM(C2:C40)<5,"Min 5 cases","OK")' },
      scope: { target: "category", categoryId: "grains" },
      basis: "quantity",
      threshold: 5,
    },
    {
      id: "sales-tax",
      type: "tax",
      plainEnglish: "Sales tax of 8% is added to the order subtotal.",
      source: { sheet: "Order", range: "E42", formula: "=E41*0.08" },
      scope: { target: "all" },
      ratePercent: 8,
      inclusive: false,
    },
  ],
  validations: [
    {
      id: "sku-required",
      kind: "required",
      field: { tableId: "pricelist", fieldKey: "sku" },
    },
    {
      id: "category-enum",
      kind: "enum",
      field: { tableId: "pricelist", fieldKey: "category" },
      allowed: ["Grains & Flour", "Oils & Vinegars", "Canned Goods"],
      source: { sheet: "PriceList", range: "C2:C40" },
    },
  ],
  findings: [
    {
      id: "f-pricelist",
      confidence: "high",
      plainEnglish: "Found a trade price list of 3 SKUs across 3 categories.",
      accepted: true,
    },
    {
      id: "f-tier-flour",
      targetRef: { kind: "rule", id: "tier-flour" },
      confidence: "high",
      plainEnglish: "Detected quantity-break pricing on Tipo 00 Flour at 10 and 25 cases.",
      accepted: true,
    },
    {
      id: "f-tax",
      targetRef: { kind: "rule", id: "sales-tax" },
      confidence: "medium",
      plainEnglish: "An 8% tax line was found on the order sheet.",
      question: "Is 8% the correct sales-tax rate for all delivery regions?",
      accepted: false,
    },
  ],
};
