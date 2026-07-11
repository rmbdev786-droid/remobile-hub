import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "./index";
import {
  channelOffers,
  eanMapping,
  orders,
  pricingRules,
  products,
  supplierProducts,
  syncLog,
} from "./schema";
import { demoStore } from "./demo-store";
import { buildAutomatedOfferPatch } from "@/lib/sync/offer-update";
import type {
  CatalogEntry,
  ChannelOffer,
  DashboardSnapshot,
  EanMapping,
  FoxwayProduct,
  MappingApprovalInput,
  OfferView,
  Order,
  PricingRule,
  Product,
  StockSettings,
  SupplierProduct,
  SyncLog,
} from "@/types";

function asSupplierProduct(row: typeof supplierProducts.$inferSelect): SupplierProduct {
  return {
    id: row.id,
    productId: row.productId,
    supplier: "foxway",
    supplierSku: row.supplierSku,
    productName: row.productName,
    color: row.color,
    gradeRaw: row.gradeRaw as SupplierProduct["gradeRaw"],
    costPriceCents: row.costPriceCents,
    stockQty: row.stockQty,
    additionalInfo: row.additionalInfo,
    vatType: row.vatType,
    lastSyncedAt: row.lastSyncedAt,
    isActive: row.isActive,
  };
}

function asOffer(row: typeof channelOffers.$inferSelect): ChannelOffer {
  return {
    id: row.id,
    productId: row.productId,
    supplierProductId: row.supplierProductId,
    channel: row.channel as ChannelOffer["channel"],
    channelOfferId: row.channelOfferId,
    channelCondition: "REFURBISHED",
    bolGrade: row.bolGrade as ChannelOffer["bolGrade"],
    isMarginProduct: true,
    sellPriceCents: row.sellPriceCents,
    priceOverride: row.priceOverride,
    minPriceCents: row.minPriceCents,
    stockListed: row.stockListed,
    status: row.status as ChannelOffer["status"],
    buyBoxPosition: row.buyBoxPosition as ChannelOffer["buyBoxPosition"],
    competitorPriceCents: row.competitorPriceCents,
    lastPriceUpdate: row.lastPriceUpdate,
    lastStockUpdate: row.lastStockUpdate,
    createdAt: row.createdAt,
  };
}

function asOrder(row: typeof orders.$inferSelect): Order {
  return {
    id: row.id,
    channel: row.channel as Order["channel"],
    channelOrderId: row.channelOrderId,
    foxwayReference: row.foxwayReference,
    foxwayStatus: row.foxwayStatus as Order["foxwayStatus"],
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    shippingAddress: row.shippingAddress,
    items: row.items,
    trackingCode: row.trackingCode,
    carrier: row.carrier,
    totalSellCents: row.totalSellCents,
    totalCostCents: row.totalCostCents,
    profitCents: row.profitCents,
    status: row.status as Order["status"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function asSyncLog(row: typeof syncLog.$inferSelect): SyncLog {
  return {
    id: row.id,
    syncType: row.syncType as SyncLog["syncType"],
    channel: row.channel as SyncLog["channel"],
    supplier: row.supplier as SyncLog["supplier"],
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    offersCreated: row.offersCreated,
    offersUpdated: row.offersUpdated,
    offersPaused: row.offersPaused,
    ordersProcessed: row.ordersProcessed,
    errors: row.errors,
    status: row.status as SyncLog["status"],
  };
}

function asMapping(row: typeof eanMapping.$inferSelect): EanMapping {
  return {
    id: row.id,
    foxwayProductName: row.foxwayProductName,
    foxwayColor: row.foxwayColor,
    ean: row.ean,
    bolTitle: row.bolTitle,
    confidence: row.confidence as EanMapping["confidence"],
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    createdAt: row.createdAt,
  };
}

export async function listCatalog(): Promise<CatalogEntry[]> {
  if (!db) {
    return demoStore.supplierProducts.map((supplierProduct) => {
      const mapping = demoStore.mappings.find(
        (candidate) =>
          candidate.foxwayProductName === supplierProduct.productName &&
          candidate.foxwayColor === supplierProduct.color,
      );
      return {
        ...supplierProduct,
        ean: mapping?.ean ?? null,
        mappingStatus: mapping?.approvedAt ? "mapped" : mapping ? "pending" : "unmapped",
        mappingConfidence: mapping?.confidence ?? "PENDING",
        mappingId: mapping?.id ?? null,
      };
    });
  }

  const [supplierRows, mappingRows] = await Promise.all([
    db.select().from(supplierProducts).orderBy(desc(supplierProducts.lastSyncedAt)),
    db.select().from(eanMapping),
  ]);
  const mappings = mappingRows.map(asMapping);

  return supplierRows.map((row) => {
    const supplierProduct = asSupplierProduct(row);
    const mapping = mappings.find(
      (candidate) =>
        candidate.foxwayProductName === supplierProduct.productName &&
        candidate.foxwayColor === supplierProduct.color,
    );
    return {
      ...supplierProduct,
      ean: mapping?.ean ?? null,
      mappingStatus: mapping?.approvedAt ? "mapped" : mapping ? "pending" : "unmapped",
      mappingConfidence: mapping?.confidence ?? "PENDING",
      mappingId: mapping?.id ?? null,
    };
  });
}

export async function listMappings(): Promise<EanMapping[]> {
  if (!db) return [...demoStore.mappings];
  const rows = await db.select().from(eanMapping).orderBy(desc(eanMapping.createdAt));
  return rows.map(asMapping);
}

export async function approveMapping(input: MappingApprovalInput): Promise<EanMapping> {
  const approvedAt = new Date();
  if (!db) {
    const mapping = demoStore.mappings.find((candidate) => candidate.id === input.mappingId);
    if (!mapping) throw new Error("EAN mapping not found.");
    Object.assign(mapping, {
      ean: input.ean,
      bolTitle: input.bolTitle,
      confidence: input.confidence,
      approvedBy: input.approvedBy,
      approvedAt,
    });
    return mapping;
  }

  const [row] = await db
    .update(eanMapping)
    .set({
      ean: input.ean,
      bolTitle: input.bolTitle,
      confidence: input.confidence,
      approvedBy: input.approvedBy,
      approvedAt,
    })
    .where(eq(eanMapping.id, input.mappingId))
    .returning();
  if (!row) throw new Error("EAN mapping not found.");
  return asMapping(row);
}

export async function approveGeneratedMapping(
  input: Omit<MappingApprovalInput, "mappingId"> & {
    mappingId?: string;
    foxwayProductName: string;
    foxwayColor: string;
  },
): Promise<EanMapping> {
  if (input.mappingId) {
    return approveMapping({ ...input, mappingId: input.mappingId });
  }

  const approvedAt = new Date();
  if (!db) {
    const existing = demoStore.mappings.find(
      candidate =>
        candidate.foxwayProductName === input.foxwayProductName &&
        candidate.foxwayColor.toLowerCase() === input.foxwayColor.toLowerCase(),
    );
    if (existing) return approveMapping({ ...input, mappingId: existing.id });
    const mapping: EanMapping = {
      id: crypto.randomUUID(),
      foxwayProductName: input.foxwayProductName,
      foxwayColor: input.foxwayColor,
      ean: input.ean,
      bolTitle: input.bolTitle,
      confidence: input.confidence,
      approvedBy: input.approvedBy,
      approvedAt,
      createdAt: approvedAt,
    };
    demoStore.mappings.unshift(mapping);
    return mapping;
  }

  const [row] = await db
    .insert(eanMapping)
    .values({
      id: crypto.randomUUID(),
      foxwayProductName: input.foxwayProductName,
      foxwayColor: input.foxwayColor,
      ean: input.ean,
      bolTitle: input.bolTitle,
      confidence: input.confidence,
      approvedBy: input.approvedBy,
      approvedAt,
    })
    .returning();
  if (!row) throw new Error("EAN mapping could not be created.");
  return asMapping(row);
}

export async function listOffers(): Promise<OfferView[]> {
  if (!db) {
    return demoStore.offers.flatMap((offer) => {
      const product = demoStore.products.find((candidate) => candidate.id === offer.productId);
      const supplier = demoStore.supplierProducts.find(
        (candidate) => candidate.id === offer.supplierProductId,
      );
      if (!product || !supplier) return [];
      return [{
        ...offer,
        ean: product.ean,
        productName: supplier.productName,
        supplierSku: supplier.supplierSku,
        color: supplier.color,
        storage: product.storage,
        supplierGrade: supplier.gradeRaw,
        costPriceCents: supplier.costPriceCents,
        supplierStock: supplier.stockQty,
      }];
    });
  }

  const [offerRows, productRows, supplierRows] = await Promise.all([
    db.select().from(channelOffers).orderBy(desc(channelOffers.createdAt)),
    db.select().from(products),
    db.select().from(supplierProducts),
  ]);

  return offerRows.flatMap((row) => {
    const offer = asOffer(row);
    const product = productRows.find((candidate) => candidate.id === offer.productId);
    const supplierRow = supplierRows.find((candidate) => candidate.id === offer.supplierProductId);
    if (!product || !supplierRow) return [];
    const supplier = asSupplierProduct(supplierRow);
    return [{
      ...offer,
      ean: product.ean,
      productName: supplier.productName,
      supplierSku: supplier.supplierSku,
      color: supplier.color,
      storage: product.storage,
      supplierGrade: supplier.gradeRaw,
      costPriceCents: supplier.costPriceCents,
      supplierStock: supplier.stockQty,
    }];
  });
}

export async function getOffer(offerId: string): Promise<OfferView | null> {
  const offers = await listOffers();
  return offers.find((offer) => offer.id === offerId) ?? null;
}

export async function setOfferPrice(offerId: string, sellPriceCents: number): Promise<OfferView> {
  const updatedAt = new Date();
  if (!db) {
    const offer = demoStore.offers.find((candidate) => candidate.id === offerId);
    if (!offer) throw new Error("Offer not found.");
    offer.sellPriceCents = sellPriceCents;
    offer.priceOverride = true;
    offer.lastPriceUpdate = updatedAt;
    const view = await getOffer(offerId);
    if (!view) throw new Error("Offer view could not be constructed.");
    return view;
  }

  await db
    .update(channelOffers)
    .set({ sellPriceCents, priceOverride: true, lastPriceUpdate: updatedAt })
    .where(eq(channelOffers.id, offerId));
  const view = await getOffer(offerId);
  if (!view) throw new Error("Offer not found.");
  return view;
}

export async function resetOfferPrice(offerId: string): Promise<OfferView> {
  if (!db) {
    const offer = demoStore.offers.find((candidate) => candidate.id === offerId);
    if (!offer) throw new Error("Offer not found.");
    offer.priceOverride = false;
    const view = await getOffer(offerId);
    if (!view) throw new Error("Offer view could not be constructed.");
    return view;
  }

  await db.update(channelOffers).set({ priceOverride: false }).where(eq(channelOffers.id, offerId));
  const view = await getOffer(offerId);
  if (!view) throw new Error("Offer not found.");
  return view;
}

export async function listOrders(): Promise<Order[]> {
  if (!db) return [...demoStore.orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  return rows.map(asOrder);
}

export async function listSyncLogs(): Promise<SyncLog[]> {
  if (!db) return [...demoStore.syncLogs].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  const rows = await db.select().from(syncLog).orderBy(desc(syncLog.startedAt));
  return rows.map(asSyncLog);
}

export async function saveSyncLog(log: SyncLog): Promise<SyncLog> {
  if (!db) {
    demoStore.syncLogs.unshift(log);
    return log;
  }
  const [row] = await db
    .insert(syncLog)
    .values({
      id: log.id,
      syncType: log.syncType,
      channel: log.channel,
      supplier: log.supplier,
      startedAt: log.startedAt,
      completedAt: log.completedAt,
      offersCreated: log.offersCreated,
      offersUpdated: log.offersUpdated,
      offersPaused: log.offersPaused,
      ordersProcessed: log.ordersProcessed,
      errors: log.errors,
      status: log.status,
    })
    .returning();
  if (!row) throw new Error("Sync log could not be saved.");
  return asSyncLog(row);
}

export async function listPricingRules(): Promise<PricingRule[]> {
  if (!db) return [...demoStore.pricingRules];
  const rows = await db.select().from(pricingRules).orderBy(pricingRules.supplierGrade);
  return rows.map((row) => ({
    id: row.id,
    channel: row.channel as PricingRule["channel"],
    supplierGrade: row.supplierGrade as PricingRule["supplierGrade"],
    marginPercent: row.marginPercent,
    roundToNearest: row.roundToNearest,
    updatedAt: row.updatedAt,
  }));
}

export async function updatePricingRule(
  ruleId: string,
  marginPercent: string,
  roundToNearest: number,
): Promise<PricingRule> {
  const updatedAt = new Date();
  if (!db) {
    const rule = demoStore.pricingRules.find((candidate) => candidate.id === ruleId);
    if (!rule) throw new Error("Pricing rule not found.");
    rule.marginPercent = marginPercent;
    rule.roundToNearest = roundToNearest;
    rule.updatedAt = updatedAt;
    return rule;
  }
  const [row] = await db
    .update(pricingRules)
    .set({ marginPercent, roundToNearest, updatedAt })
    .where(eq(pricingRules.id, ruleId))
    .returning();
  if (!row) throw new Error("Pricing rule not found.");
  return {
    id: row.id,
    channel: row.channel as PricingRule["channel"],
    supplierGrade: row.supplierGrade as PricingRule["supplierGrade"],
    marginPercent: row.marginPercent,
    roundToNearest: row.roundToNearest,
    updatedAt: row.updatedAt,
  };
}

export async function getStockSettings(): Promise<StockSettings> {
  return structuredClone(demoStore.stockSettings);
}

export async function updateStockSettings(settings: StockSettings): Promise<StockSettings> {
  demoStore.stockSettings = structuredClone(settings);
  return structuredClone(demoStore.stockSettings);
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [allOrders, allOffers, allSyncs] = await Promise.all([
    listOrders(),
    listOffers(),
    listSyncLogs(),
  ]);
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const monthlyOrders = allOrders.filter((order) => order.createdAt >= monthStart);
  const offersWithBuyBox = allOffers.filter((offer) => offer.buyBoxPosition !== "UNKNOWN");
  const winningOffers = offersWithBuyBox.filter((offer) => offer.buyBoxPosition === "WIN").length;

  return {
    totalRevenueCents: monthlyOrders.reduce((sum, order) => sum + order.totalSellCents, 0),
    grossProfitCents: monthlyOrders.reduce((sum, order) => sum + order.profitCents, 0),
    activeOffers: allOffers.filter((offer) => offer.status === "active").length,
    ordersToday: allOrders.filter((order) => order.createdAt >= dayStart).length,
    pendingOrders: allOrders.filter((order) => order.status === "pending").length,
    buyBoxWinRate: offersWithBuyBox.length === 0 ? 0 : Math.round((winningOffers / offersWithBuyBox.length) * 100),
    foxwayCreditCents: 100_000_00,
    foxwayAvailableCreditCents: 72_450_00,
    lastSync: allSyncs[0] ?? null,
    recentOrders: allOrders.slice(0, 10),
    recentSyncs: allSyncs.slice(0, 5),
  };
}

export async function findActiveOfferBySupplierProduct(
  supplierProductId: string,
): Promise<ChannelOffer | null> {
  if (!db) {
    return (
      demoStore.offers.find(
        (offer) => offer.supplierProductId === supplierProductId && offer.status !== "deleted",
      ) ?? null
    );
  }
  const [row] = await db
    .select()
    .from(channelOffers)
    .where(
      and(
        eq(channelOffers.supplierProductId, supplierProductId),
        gte(channelOffers.createdAt, new Date(0)),
      ),
    )
    .limit(1);
  return row ? asOffer(row) : null;
}

export async function upsertSupplierCatalogProduct(product: FoxwayProduct): Promise<SupplierProduct> {
  const now = new Date();
  const costPriceCents = Math.round(
    (product.campaignPrice !== null && product.campaignPrice > 0
      ? product.campaignPrice
      : product.price) * 100,
  );
  const normalized: SupplierProduct = {
    id: `supplier-${product.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    productId: null,
    supplier: "foxway",
    supplierSku: product.sku,
    productName: product.productName,
    color: product.color,
    gradeRaw: product.appearance,
    costPriceCents,
    stockQty: Math.max(0, Math.trunc(product.quantity)),
    additionalInfo: product.additionalInfo || null,
    vatType: product.vatType || null,
    lastSyncedAt: now,
    isActive: true,
  };

  if (!db) {
    const existing = demoStore.supplierProducts.find(
      (candidate) => candidate.supplierSku === product.sku,
    );
    if (existing) {
      Object.assign(existing, normalized, { id: existing.id, productId: existing.productId });
      return existing;
    }
    demoStore.supplierProducts.push(normalized);
    return normalized;
  }

  const [row] = await db
    .insert(supplierProducts)
    .values(normalized)
    .onConflictDoUpdate({
      target: supplierProducts.supplierSku,
      set: {
        productName: normalized.productName,
        color: normalized.color,
        gradeRaw: normalized.gradeRaw,
        costPriceCents: normalized.costPriceCents,
        stockQty: normalized.stockQty,
        additionalInfo: normalized.additionalInfo,
        vatType: normalized.vatType,
        lastSyncedAt: normalized.lastSyncedAt,
        isActive: true,
      },
    })
    .returning();
  if (!row) throw new Error("Supplier product could not be persisted.");
  return asSupplierProduct(row);
}

export async function ensureProductForEan(
  ean: string,
  supplierProduct: SupplierProduct,
): Promise<Product> {
  if (!db) {
    const existing = demoStore.products.find((candidate) => candidate.ean === ean);
    if (existing) return existing;
    const now = new Date();
    const created: Product = {
      id: `product-${ean}`,
      ean,
      brand: "Apple",
      modelFamily: supplierProduct.productName,
      storage: supplierProduct.productName.match(/\b\d+\s*(?:GB|TB)\b/i)?.[0]?.replace(/\s/g, "") ?? null,
      color: supplierProduct.color,
      category: "Smartphones",
      imageUrl: null,
      createdAt: now,
      updatedAt: now,
    };
    demoStore.products.push(created);
    supplierProduct.productId = created.id;
    return created;
  }

  const [existing] = await db.select().from(products).where(eq(products.ean, ean)).limit(1);
  if (existing) return existing;
  const now = new Date();
  const [created] = await db
    .insert(products)
    .values({
      id: `product-${ean}`,
      ean,
      brand: "Apple",
      modelFamily: supplierProduct.productName,
      storage: supplierProduct.productName.match(/\b\d+\s*(?:GB|TB)\b/i)?.[0]?.replace(/\s/g, "") ?? null,
      color: supplierProduct.color,
      category: "Smartphones",
      imageUrl: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!created) throw new Error("Product could not be created for approved EAN.");
  await db
    .update(supplierProducts)
    .set({ productId: created.id })
    .where(eq(supplierProducts.id, supplierProduct.id));
  return created;
}

export interface NewChannelOfferInput {
  id: string;
  productId: string;
  supplierProductId: string;
  channelOfferId: string;
  bolGrade: ChannelOffer["bolGrade"];
  sellPriceCents: number;
  minPriceCents: number;
  stockListed: number;
}

export async function saveChannelOffer(input: NewChannelOfferInput): Promise<ChannelOffer> {
  const createdAt = new Date();
  const created: ChannelOffer = {
    id: input.id,
    productId: input.productId,
    supplierProductId: input.supplierProductId,
    channel: "bol_nl",
    channelOfferId: input.channelOfferId,
    channelCondition: "REFURBISHED",
    bolGrade: input.bolGrade,
    isMarginProduct: true,
    sellPriceCents: input.sellPriceCents,
    priceOverride: false,
    minPriceCents: input.minPriceCents,
    stockListed: input.stockListed,
    status: "active",
    buyBoxPosition: "UNKNOWN",
    competitorPriceCents: null,
    lastPriceUpdate: createdAt,
    lastStockUpdate: createdAt,
    createdAt,
  };

  if (!db) {
    demoStore.offers.push(created);
    return created;
  }
  const [row] = await db.insert(channelOffers).values(created).returning();
  if (!row) throw new Error("Channel offer could not be persisted.");
  return asOffer(row);
}

export async function applyAutomatedOfferSync(
  offerId: string,
  update: { sellPriceCents: number; stockListed: number },
): Promise<ChannelOffer> {
  const now = new Date();
  if (!db) {
    const offer = demoStore.offers.find((candidate) => candidate.id === offerId);
    if (!offer) throw new Error("Offer not found.");
    Object.assign(offer, buildAutomatedOfferPatch(offer.priceOverride, update, now));
    return offer;
  }

  const [current] = await db.select().from(channelOffers).where(eq(channelOffers.id, offerId)).limit(1);
  if (!current) throw new Error("Offer not found.");
  const [row] = await db
    .update(channelOffers)
    .set(buildAutomatedOfferPatch(current.priceOverride, update, now))
    .where(eq(channelOffers.id, offerId))
    .returning();
  if (!row) throw new Error("Offer sync update failed.");
  return asOffer(row);
}

export async function saveImportedOrder(order: Order): Promise<Order> {
  if (!db) {
    const existing = demoStore.orders.find(
      (candidate) => candidate.channelOrderId === order.channelOrderId,
    );
    if (existing) return existing;
    demoStore.orders.unshift(order);
    return order;
  }
  const [row] = await db
    .insert(orders)
    .values(order)
    .onConflictDoUpdate({
      target: orders.channelOrderId,
      set: {
        foxwayReference: order.foxwayReference,
        foxwayStatus: order.foxwayStatus,
        trackingCode: order.trackingCode,
        carrier: order.carrier,
        status: order.status,
        updatedAt: order.updatedAt,
      },
    })
    .returning();
  if (!row) throw new Error("Imported order could not be persisted.");
  return asOrder(row);
}

export async function updateOrderFulfillment(
  orderId: string,
  update: Pick<Order, "foxwayStatus" | "trackingCode" | "carrier" | "status">,
): Promise<Order> {
  const updatedAt = new Date();
  if (!db) {
    const order = demoStore.orders.find((candidate) => candidate.id === orderId);
    if (!order) throw new Error("Order not found.");
    Object.assign(order, update, { updatedAt });
    return order;
  }
  const [row] = await db
    .update(orders)
    .set({ ...update, updatedAt })
    .where(eq(orders.id, orderId))
    .returning();
  if (!row) throw new Error("Order not found.");
  return asOrder(row);
}
