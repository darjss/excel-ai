export interface PricingTier {
  name: string;
  priceMonthly: number;
  tagline: string;
  features: string[];
  highlighted: boolean;
}

export const pricingTiers: PricingTier[] = [
  {
    name: "Standard",
    priceMonthly: 29,
    tagline: "Everything to run ordering on your subdomain.",
    features: [
      "Unlimited buyers",
      "Unlimited orders",
      "Your catalog and rules from your own sheet",
      "Orders written back to your sheet",
      "Portal on your subdomain",
      "Made-with-Sheetstand badge",
    ],
    highlighted: true,
  },
  {
    name: "Pro",
    priceMonthly: 49,
    tagline: "Your own domain and a faster sync.",
    features: [
      "Everything in Standard",
      "Custom domain",
      "Badge removed",
      "Faster import interval",
    ],
    highlighted: false,
  },
];

export interface CommissionRow {
  label: string;
  sheetstand: string;
  incumbent: string;
}

export const commissionComparison: CommissionRow[] = [
  { label: "Cost of a $10,000 sales month", sheetstand: "$29 flat", incumbent: "$1,500 at 15%" },
  {
    label: "Adding buyers",
    sheetstand: "Unlimited, no charge",
    incumbent: "Often billed per user",
  },
  {
    label: "Adding orders",
    sheetstand: "Unlimited, no charge",
    incumbent: "Counts against your plan",
  },
  {
    label: "Where prices live",
    sheetstand: "Your spreadsheet",
    incumbent: "Rebuilt in their editor",
  },
  {
    label: "Your buyers",
    sheetstand: "Yours, ordering direct",
    incumbent: "The marketplace's audience",
  },
];
