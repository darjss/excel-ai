import type { Money } from "@/portal-config";

const fractionDigitsFor = (currencyCode: string): number =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).resolvedOptions()
    .maximumFractionDigits ?? 2;

export const formatMoney = (money: Money): string => {
  const fractionDigits = fractionDigitsFor(money.currencyCode);
  const major = money.amount / 10 ** fractionDigits;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: money.currencyCode,
  }).format(major);
};
