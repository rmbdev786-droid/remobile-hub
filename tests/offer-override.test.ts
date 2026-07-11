import { describe, expect, it } from "vitest";
import { buildAutomatedOfferPatch } from "@/lib/sync/offer-update";

describe("automated offer update safety", () => {
  const now = new Date("2026-07-11T12:00:00.000Z");

  it("updates stock but omits price fields for a manual override", () => {
    expect(buildAutomatedOfferPatch(true, { sellPriceCents: 39_999, stockListed: 8 }, now)).toEqual({
      stockListed: 8,
      lastStockUpdate: now,
    });
  });

  it("updates both price and stock when automatic pricing is active", () => {
    expect(buildAutomatedOfferPatch(false, { sellPriceCents: 39_999, stockListed: 8 }, now)).toEqual({
      sellPriceCents: 39_999,
      lastPriceUpdate: now,
      stockListed: 8,
      lastStockUpdate: now,
    });
  });
});
