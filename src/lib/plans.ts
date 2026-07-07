export type PlanSlug = "standard" | "pro";

export interface PlanEntitlements {
  badgeRemoved: boolean;
  customDomain: boolean;
  fastImport: boolean;
}

export interface Plan {
  slug: PlanSlug;
  name: string;
  description: string;
  priceMonthly: number;
  features: string[];
  entitlements: PlanEntitlements;
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
    entitlements: { badgeRemoved: false, customDomain: false, fastImport: false },
    highlighted: true,
  },
  {
    slug: "pro",
    name: "Pro",
    description: "Your own domain and a faster sync.",
    priceMonthly: 49,
    features: ["Everything in Standard", "Custom domain", "Badge removed", "Faster import interval"],
    entitlements: { badgeRemoved: true, customDomain: true, fastImport: true },
    highlighted: false,
  },
];

export const isPlanSlug = (value: string): value is PlanSlug =>
  plans.some((plan) => plan.slug === value);

export const planBySlug = (slug: string): Plan | null =>
  plans.find((plan) => plan.slug === slug) ?? null;

const STANDARD_ENTITLEMENTS: PlanEntitlements = {
  badgeRemoved: false,
  customDomain: false,
  fastImport: false,
};

export const entitlementsFor = (slug: string): PlanEntitlements =>
  planBySlug(slug)?.entitlements ?? STANDARD_ENTITLEMENTS;
