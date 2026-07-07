import type { TemplateSpec } from "./templates";

export interface PreviewRow {
  product: string;
  unit: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface TemplatePreview {
  rows: PreviewRow[];
  subtotal: string;
  tax: { label: string; amount: string } | null;
  total: string;
}

export const formatMoney = (value: number, symbol: string): string =>
  `${symbol}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const templatePreview = (spec: TemplateSpec): TemplatePreview => {
  const symbol = spec.currencySymbol;
  const rows = spec.lineItems.map((item) => ({
    product: item.product,
    unit: item.unit,
    unitPrice: formatMoney(item.unitPrice, symbol),
    quantity: item.sampleQuantity,
    lineTotal: formatMoney(item.unitPrice * item.sampleQuantity, symbol),
  }));
  const subtotalValue = spec.lineItems.reduce(
    (sum, item) => sum + item.unitPrice * item.sampleQuantity,
    0,
  );
  const taxValue = spec.taxRatePercent === null ? 0 : subtotalValue * (spec.taxRatePercent / 100);
  const tax =
    spec.taxRatePercent === null || spec.taxLabel === null
      ? null
      : { label: spec.taxLabel, amount: formatMoney(taxValue, symbol) };
  return {
    rows,
    subtotal: formatMoney(subtotalValue, symbol),
    tax,
    total: formatMoney(subtotalValue + taxValue, symbol),
  };
};
