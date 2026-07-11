import { bolClient } from "@/lib/bol/client";
import {
  applyAutomatedOfferSync,
  listOffers,
  listPricingRules,
  getStockSettings,
  saveSyncLog,
} from "@/lib/db/repository";
import { calculateSellPrice, calculateStock, shouldRecalculatePrice } from "@/lib/pricing/engine";
import type { SyncStats } from "@/types";

export async function runPriceStockSync(): Promise<SyncStats> {
  const startedAt = new Date();
  const stats: SyncStats = { created: 0, updated: 0, paused: 0, noEan: 0, errors: [] };
  const [offers, rules, stockSettings] = await Promise.all([
    listOffers(),
    listPricingRules(),
    getStockSettings(),
  ]);

  for (const offer of offers) {
    try {
      if (!offer.channelOfferId || offer.status === "deleted") continue;
      const rule = rules.find((candidate) => candidate.supplierGrade === offer.supplierGrade);
      if (!rule) throw new Error(`No pricing rule exists for ${offer.supplierGrade}.`);
      const nextPrice = calculateSellPrice(
        offer.costPriceCents / 100,
        Number(rule.marginPercent) / 100,
        rule.roundToNearest,
      ).sellPriceCents;
      const nextStock = calculateStock(
        offer.supplierStock,
        stockSettings.buffer,
        stockSettings.minToList,
      );
      const priceChanged =
        shouldRecalculatePrice(offer.priceOverride) && offer.sellPriceCents !== nextPrice;
      const stockChanged = offer.stockListed !== nextStock;
      if (!priceChanged && !stockChanged) continue;

      await bolClient.updateOffer(offer.channelOfferId, {
        ...(priceChanged ? { sellPriceCents: nextPrice } : {}),
        ...(stockChanged ? { stock: nextStock } : {}),
        conditionGrade: offer.bolGrade === "A" ? "B" : offer.bolGrade,
      });
      await applyAutomatedOfferSync(offer.id, {
        sellPriceCents: nextPrice,
        stockListed: nextStock,
      });
      stats.updated += 1;
      if (nextStock === 0) stats.paused += 1;
    } catch (error) {
      stats.errors.push({
        ean: offer.ean,
        message: error instanceof Error ? error.message : "Offer synchronization failed.",
      });
    }
  }

  await saveSyncLog({
    id: crypto.randomUUID(),
    syncType: "price_stock_sync",
    channel: "bol_nl",
    supplier: "foxway",
    startedAt,
    completedAt: new Date(),
    offersCreated: 0,
    offersUpdated: stats.updated,
    offersPaused: stats.paused,
    ordersProcessed: 0,
    errors: stats.errors,
    status: stats.errors.length === 0 ? "success" : stats.updated > 0 ? "partial" : "failed",
  });
  return stats;
}
