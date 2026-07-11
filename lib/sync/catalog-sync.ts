import { APP_CONFIG } from "@/lib/config";
import {
  listMappings,
  saveSyncLog,
  upsertSupplierCatalogProduct,
} from "@/lib/db/repository";
import { foxwayClient } from "@/lib/foxway/client";
import { groupFoxwayProducts } from "@/lib/pricing/engine";
import { createOfferForApprovedEan } from "./create-offer";
import type { SyncError, SyncStats } from "@/types";

export async function runCatalogSync(): Promise<SyncStats> {
  const startedAt = new Date();
  const stats: SyncStats = { created: 0, updated: 0, paused: 0, noEan: 0, errors: [] };

  try {
    const catalog = await foxwayClient.getCatalogProducts(APP_CONFIG.foxwayCatalogSlug);
    const iphoneProducts = catalog.filter((product) => /iphone/i.test(product.productName));
    const groups = groupFoxwayProducts(iphoneProducts);
    const mappings = await listMappings();

    for (const group of groups) {
      try {
        const representative = group.variants[0];
        if (!representative) continue;
        const stored = await upsertSupplierCatalogProduct({
          ...representative,
          productName: group.productName,
          quantity: group.totalStock,
          price: group.bestCostEur,
          campaignPrice: null,
        });
        const mapping = mappings.find(
          (candidate) =>
            candidate.approvedAt !== null &&
            candidate.ean !== null &&
            candidate.foxwayProductName === stored.productName &&
            candidate.foxwayColor.toLowerCase() === stored.color.toLowerCase(),
        );
        if (!mapping?.ean) {
          stats.noEan += 1;
          continue;
        }
        const result = await createOfferForApprovedEan(stored, mapping.ean);
        if (result.created) stats.created += 1;
        else stats.updated += 1;
      } catch (error) {
        stats.errors.push({
          ean: group.representativeSku,
          message: error instanceof Error ? error.message : "Catalog item failed.",
        });
      }
    }
  } catch (error) {
    stats.errors.push({
      ean: "catalog",
      message: error instanceof Error ? error.message : "Catalog synchronization failed.",
    });
  }

  await saveSyncLog({
    id: crypto.randomUUID(),
    syncType: "catalog_sync",
    channel: "bol_nl",
    supplier: "foxway",
    startedAt,
    completedAt: new Date(),
    offersCreated: stats.created,
    offersUpdated: stats.updated,
    offersPaused: stats.paused,
    ordersProcessed: 0,
    errors: stats.errors,
    status: stats.errors.length === 0 ? "success" : stats.created + stats.updated > 0 ? "partial" : "failed",
  });
  return stats;
}
