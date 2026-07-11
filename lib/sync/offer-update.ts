export interface AutomatedOfferUpdate {
  sellPriceCents: number;
  stockListed: number;
}

export interface AutomatedOfferPatch {
  stockListed: number;
  lastStockUpdate: Date;
  sellPriceCents?: number;
  lastPriceUpdate?: Date;
}

export function buildAutomatedOfferPatch(
  priceOverride: boolean,
  update: AutomatedOfferUpdate,
  now: Date,
): AutomatedOfferPatch {
  return {
    ...(priceOverride
      ? {}
      : { sellPriceCents: update.sellPriceCents, lastPriceUpdate: now }),
    stockListed: update.stockListed,
    lastStockUpdate: now,
  };
}
