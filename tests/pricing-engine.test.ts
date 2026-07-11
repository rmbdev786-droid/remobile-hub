import { describe, expect, it } from "vitest";
import {
  aggregateFoxwayVariants,
  calculateSellPrice,
  calculateStock,
  shouldRecalculatePrice,
} from "@/lib/pricing/engine";
import type { FoxwayProduct } from "@/types";

const variant = (overrides: Partial<FoxwayProduct> = {}): FoxwayProduct => ({
  sku: "FW-1",
  productName: "Apple iPhone 15 128GB",
  color: "Black",
  appearance: "Grade B",
  price: 300,
  campaignPrice: null,
  quantity: 4,
  additionalInfo: "",
  vatType: "VAT",
  ...overrides,
});

describe("pricing engine", () => {
  it("prices a €275 cost at a 25% margin and rounds upward to €445", () => {
    const result = calculateSellPrice(275, 0.25, 5);
    expect(result.sellPriceCents).toBe(44_500);
    expect(result.costPriceCents).toBe(27_500);
    expect(result.marginEur).toBe(92.77);
  });

  it("sums variant stock and uses the lowest effective campaign cost", () => {
    expect(aggregateFoxwayVariants([
      variant({ quantity: 3, price: 310 }),
      variant({ sku: "FW-2", quantity: 7, price: 305, campaignPrice: 289 }),
    ])).toEqual({ totalStock: 10, bestCostEur: 289 });
  });

  it("applies stock buffer and minimum listing thresholds", () => {
    expect(calculateStock(10, 2, 3)).toBe(8);
    expect(calculateStock(4, 2, 3)).toBe(0);
    expect(calculateStock(1, 2, 3)).toBe(0);
  });

  it("protects manual price overrides from automated recalculation", () => {
    expect(shouldRecalculatePrice(true)).toBe(false);
    expect(shouldRecalculatePrice(false)).toBe(true);
  });
});
