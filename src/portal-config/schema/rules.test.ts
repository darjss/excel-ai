import { describe, expect, it } from "vitest";
import { type Tier, selectTier } from "./rules";

const money = (amount: number) => ({ currencyCode: "USD", amount });

const tiers: Tier[] = [
  { minQuantity: 1, unitPrice: money(4200) },
  { minQuantity: 10, unitPrice: money(4000) },
  { minQuantity: 25, unitPrice: money(3800) },
];

describe("selectTier picks the highest tier whose minQuantity <= quantity", () => {
  const cases: ReadonlyArray<[number, number | undefined]> = [
    [0, undefined],
    [1, 1],
    [9, 1],
    [10, 10],
    [24, 10],
    [25, 25],
    [1000, 25],
  ];

  for (const [quantity, expected] of cases) {
    it(`quantity ${quantity} -> tier ${String(expected)}`, () => {
      expect(selectTier(tiers, quantity)?.minQuantity).toBe(expected);
    });
  }

  it("returns undefined for an empty tier list", () => {
    expect(selectTier([], 5)).toBeUndefined();
  });
});
