import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("formats integer minor units as major currency", () => {
    expect(formatMoney({ currencyCode: "USD", amount: 650 })).toBe("$6.50");
  });

  it("respects currencies with no minor units", () => {
    expect(formatMoney({ currencyCode: "JPY", amount: 1200 })).toBe("¥1,200");
  });

  it("formats zero", () => {
    expect(formatMoney({ currencyCode: "USD", amount: 0 })).toBe("$0.00");
  });
});
