export interface Plan {
  slug: string;
  name: string;
  description: string;
  priceMonthly: number;
  features: string[];
  highlighted: boolean;
}

export const plans: Plan[] = [
  {
    slug: "standard",
    name: "Standard",
    description: "Everything to run ordering on your subdomain.",
    priceMonthly: 29,
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
    slug: "pro",
    name: "Pro",
    description: "Your own domain and a faster sync.",
    priceMonthly: 49,
    features: ["Everything in Standard", "Custom domain", "Badge removed", "Faster import interval"],
    highlighted: false,
  },
];
