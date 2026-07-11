import { bolClient } from "@/lib/bol/client";
import {
  listOffers,
  listOrders,
  saveImportedOrder,
  saveSyncLog,
  updateOrderFulfillment,
} from "@/lib/db/repository";
import { foxwayClient } from "@/lib/foxway/client";
import type { Order, SyncStats } from "@/types";

function normalizeFoxwayStatus(status: number): Order["foxwayStatus"] {
  return status >= 1 && status <= 5 ? (status as 1 | 2 | 3 | 4 | 5) : null;
}

export async function runOrderSync(): Promise<SyncStats> {
  const startedAt = new Date();
  const stats: SyncStats = { created: 0, updated: 0, paused: 0, noEan: 0, errors: [] };
  const [bolOrders, existingOrders, offers] = await Promise.all([
    bolClient.getOrders(),
    listOrders(),
    listOffers(),
  ]);

  for (const order of existingOrders) {
    if (!order.foxwayReference || order.status === "shipped" || order.status === "cancelled") continue;
    try {
      const foxwayOrder = await foxwayClient.getDropshipOrder(order.foxwayReference);
      const foxwayStatus = normalizeFoxwayStatus(foxwayOrder.status);
      await updateOrderFulfillment(order.id, {
        foxwayStatus,
        trackingCode: foxwayOrder.trackingCode,
        carrier: foxwayOrder.carrier,
        status:
          foxwayStatus === 4
            ? "shipped"
            : foxwayStatus === 5
              ? "cancelled"
              : foxwayStatus === null
                ? "error"
                : "in_process",
      });
      stats.updated += 1;
    } catch (error) {
      stats.errors.push({
        ean: order.channelOrderId,
        message: error instanceof Error ? error.message : "Foxway order refresh failed.",
      });
    }
  }

  for (const bolOrder of bolOrders) {
    if (existingOrders.some((order) => order.channelOrderId === bolOrder.orderId)) continue;
    try {
      const internalItems = bolOrder.orderItems.map((item) => {
        const offer = offers.find((candidate) => candidate.ean === item.ean);
        return {
          ean: item.ean,
          ...(offer?.id ? { offerId: offer.id } : {}),
          productTitle: item.productTitle,
          supplierSku: offer?.supplierSku ?? item.offerReference ?? item.ean,
          quantity: item.quantity,
          unitSellCents: Math.round(item.unitPrice * 100),
          unitCostCents: offer?.costPriceCents ?? 0,
        };
      });
      const dropship = await foxwayClient.createDropshipOrder({
        orderReference: bolOrder.orderId,
        shippingAddress: bolOrder.shipmentDetails,
        items: internalItems.map((item) => ({ sku: item.supplierSku, quantity: item.quantity })),
      });
      const totalSellCents = internalItems.reduce(
        (sum, item) => sum + item.unitSellCents * item.quantity,
        0,
      );
      const totalCostCents = internalItems.reduce(
        (sum, item) => sum + item.unitCostCents * item.quantity,
        0,
      );
      const now = new Date();
      await saveImportedOrder({
        id: crypto.randomUUID(),
        channel: "bol_nl",
        channelOrderId: bolOrder.orderId,
        foxwayReference: dropship.reference,
        foxwayStatus: normalizeFoxwayStatus(dropship.status),
        customerName: `${bolOrder.shipmentDetails.firstName} ${bolOrder.shipmentDetails.surname}`.trim(),
        customerEmail: bolOrder.shipmentDetails.email,
        customerPhone: null,
        shippingAddress: bolOrder.shipmentDetails,
        items: internalItems,
        trackingCode: dropship.trackingCode,
        carrier: dropship.carrier,
        totalSellCents,
        totalCostCents,
        profitCents: totalSellCents - totalCostCents,
        status: "in_process",
        createdAt: new Date(bolOrder.orderPlacedDateTime),
        updatedAt: now,
      });
      stats.updated += 1;
    } catch (error) {
      stats.errors.push({
        ean: bolOrder.orderId,
        message: error instanceof Error ? error.message : "Order import failed.",
      });
    }
  }

  await saveSyncLog({
    id: crypto.randomUUID(),
    syncType: "order_sync",
    channel: "bol_nl",
    supplier: "foxway",
    startedAt,
    completedAt: new Date(),
    offersCreated: 0,
    offersUpdated: 0,
    offersPaused: 0,
    ordersProcessed: stats.updated,
    errors: stats.errors,
    status: stats.errors.length === 0 ? "success" : stats.updated > 0 ? "partial" : "failed",
  });
  return stats;
}
