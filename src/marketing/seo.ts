import type { TemplateSpec } from "./templates";

export const templatePath = (spec: TemplateSpec): string => `/templates/${spec.slug}`;

export const templateDownloadPath = (spec: TemplateSpec): string => `/templates/${spec.slug}.xlsx`;

export const productJsonLd = (spec: TemplateSpec, canonical: string): unknown => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: `${spec.niche} order form template`,
  description: spec.metaDescription,
  category: `${spec.niche} order form`,
  brand: { "@type": "Organization", name: "Sheetstand" },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: spec.currencyCode,
    availability: "https://schema.org/InStock",
    url: canonical,
  },
});

export const faqJsonLd = (spec: TemplateSpec): unknown => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: spec.faq.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
});
