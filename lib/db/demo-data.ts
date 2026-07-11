import type {
  ChannelOffer,
  EanMapping,
  Order,
  PricingRule,
  Product,
  StockSettings,
  SupplierProduct,
  SyncLog,
} from "@/types";

const now = new Date();
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

export const demoProducts: Product[] = [
  { id: "prod-15-pro", ean: "0195949018551", brand: "Apple", modelFamily: "iPhone 15 Pro", storage: "256GB", color: "Natural Titanium", category: "Smartphones", imageUrl: null, createdAt: daysAgo(45), updatedAt: minutesAgo(25) },
  { id: "prod-14", ean: "0194253408942", brand: "Apple", modelFamily: "iPhone 14", storage: "128GB", color: "Midnight", category: "Smartphones", imageUrl: null, createdAt: daysAgo(60), updatedAt: minutesAgo(25) },
  { id: "prod-13", ean: "0194252707824", brand: "Apple", modelFamily: "iPhone 13", storage: "128GB", color: "Blue", category: "Smartphones", imageUrl: null, createdAt: daysAgo(70), updatedAt: minutesAgo(25) },
  { id: "prod-12", ean: "0194252033428", brand: "Apple", modelFamily: "iPhone 12", storage: "64GB", color: "Black", category: "Smartphones", imageUrl: null, createdAt: daysAgo(90), updatedAt: minutesAgo(25) },
  { id: "prod-se", ean: "0194253014495", brand: "Apple", modelFamily: "iPhone SE 2022", storage: "64GB", color: "Starlight", category: "Smartphones", imageUrl: null, createdAt: daysAgo(95), updatedAt: minutesAgo(25) },
];

export const demoSupplierProducts: SupplierProduct[] = [
  { id: "sup-15-pro", productId: "prod-15-pro", supplier: "foxway", supplierSku: "FW-IP15P-256-NAT-B", productName: "Apple iPhone 15 Pro 256GB", color: "Grey", gradeRaw: "Grade B", costPriceCents: 61500, stockQty: 11, additionalInfo: "", vatType: "marginal", lastSyncedAt: minutesAgo(25), isActive: true },
  { id: "sup-15-pro-bnb", productId: "prod-15-pro", supplier: "foxway", supplierSku: "FW-IP15P-256-NAT-B-BNB", productName: "Apple iPhone 15 Pro 256GB", color: "Grey", gradeRaw: "Grade B", costPriceCents: 62500, stockQty: 4, additionalInfo: "Brand New Battery", vatType: "marginal", lastSyncedAt: minutesAgo(25), isActive: true },
  { id: "sup-14", productId: "prod-14", supplier: "foxway", supplierSku: "FW-IP14-128-MID-B", productName: "Apple iPhone 14 128GB", color: "Black", gradeRaw: "Grade B", costPriceCents: 40500, stockQty: 18, additionalInfo: "", vatType: "marginal", lastSyncedAt: minutesAgo(25), isActive: true },
  { id: "sup-13", productId: "prod-13", supplier: "foxway", supplierSku: "FW-IP13-128-BLU-CPLUS", productName: "Apple iPhone 13 128GB", color: "Blue", gradeRaw: "Grade C+", costPriceCents: 31900, stockQty: 7, additionalInfo: "", vatType: "", lastSyncedAt: minutesAgo(25), isActive: true },
  { id: "sup-12", productId: "prod-12", supplier: "foxway", supplierSku: "FW-IP12-64-BLK-C", productName: "Apple iPhone 12 64GB", color: "Black", gradeRaw: "Grade C", costPriceCents: 21500, stockQty: 3, additionalInfo: "", vatType: "marginal", lastSyncedAt: minutesAgo(25), isActive: true },
  { id: "sup-se", productId: "prod-se", supplier: "foxway", supplierSku: "FW-IPSE22-64-WHT-CPLUS", productName: "Apple iPhone SE (2022) 64GB", color: "White", gradeRaw: "Grade C+", costPriceCents: 17800, stockQty: 2, additionalInfo: "", vatType: "marginal", lastSyncedAt: minutesAgo(25), isActive: true },
];

export const demoOffers: ChannelOffer[] = [
  { id: "offer-15-pro", productId: "prod-15-pro", supplierProductId: "sup-15-pro", channel: "bol_nl", channelOfferId: "5c76d703-1588-45cf-8e22-15pro", channelCondition: "REFURBISHED", bolGrade: "A", isMarginProduct: true, sellPriceCents: 99500, priceOverride: false, minPriceCents: 93400, stockListed: 13, status: "active", buyBoxPosition: "WIN", competitorPriceCents: 99900, lastPriceUpdate: minutesAgo(25), lastStockUpdate: minutesAgo(25), createdAt: daysAgo(23) },
  { id: "offer-14", productId: "prod-14", supplierProductId: "sup-14", channel: "bol_nl", channelOfferId: "5c76d703-1588-45cf-8e22-iphone14", channelCondition: "REFURBISHED", bolGrade: "A", isMarginProduct: true, sellPriceCents: 66000, priceOverride: true, minPriceCents: 62400, stockListed: 16, status: "active", buyBoxPosition: "LOSING", competitorPriceCents: 65400, lastPriceUpdate: minutesAgo(42), lastStockUpdate: minutesAgo(25), createdAt: daysAgo(32) },
  { id: "offer-13", productId: "prod-13", supplierProductId: "sup-13", channel: "bol_nl", channelOfferId: "5c76d703-1588-45cf-8e22-iphone13", channelCondition: "REFURBISHED", bolGrade: "B", isMarginProduct: true, sellPriceCents: 50000, priceOverride: false, minPriceCents: 47400, stockListed: 5, status: "active", buyBoxPosition: "TIED", competitorPriceCents: 50000, lastPriceUpdate: minutesAgo(25), lastStockUpdate: minutesAgo(25), createdAt: daysAgo(39) },
  { id: "offer-12", productId: "prod-12", supplierProductId: "sup-12", channel: "bol_nl", channelOfferId: "5c76d703-1588-45cf-8e22-iphone12", channelCondition: "REFURBISHED", bolGrade: "C", isMarginProduct: true, sellPriceCents: 32500, priceOverride: false, minPriceCents: 30900, stockListed: 0, status: "paused", buyBoxPosition: "UNKNOWN", competitorPriceCents: null, lastPriceUpdate: minutesAgo(25), lastStockUpdate: minutesAgo(25), createdAt: daysAgo(51) },
];

export const demoPricingRules: PricingRule[] = [
  { id: "rule-b", channel: "bol_nl", supplierGrade: "Grade B", marginPercent: "0.2500", roundToNearest: 5, updatedAt: daysAgo(4) },
  { id: "rule-cplus", channel: "bol_nl", supplierGrade: "Grade C+", marginPercent: "0.2200", roundToNearest: 5, updatedAt: daysAgo(4) },
  { id: "rule-c", channel: "bol_nl", supplierGrade: "Grade C", marginPercent: "0.2000", roundToNearest: 5, updatedAt: daysAgo(4) },
];

const orderModels = ["iPhone 15 Pro 256GB", "iPhone 14 128GB", "iPhone 13 128GB", "iPhone 12 64GB", "iPhone SE 2022 64GB"];
const orderStatuses: Order["status"][] = ["pending", "in_process", "shipped", "shipped", "cancelled"];

export const demoOrders: Order[] = Array.from({ length: 10 }, (_, index) => {
  const sell = 99500 - index * 5200;
  const cost = Math.round(sell * 0.68);
  const status = orderStatuses[index % orderStatuses.length] ?? "pending";
  const model = orderModels[index % orderModels.length] ?? "iPhone";
  return {
    id: `order-${index + 1}`,
    channel: "bol_nl",
    channelOrderId: `BOL-DEMO-${24073100 + index}`,
    foxwayReference: status === "pending" ? null : `FW-DEMO-${8100 + index}`,
    foxwayStatus: status === "pending" ? 1 : status === "in_process" ? 3 : status === "shipped" ? 4 : 5,
    customerName: `Demo Customer ${String(index + 1).padStart(2, "0")}`,
    customerEmail: `demo.customer.${index + 1}@example.invalid`,
    customerPhone: null,
    shippingAddress: { street: "Demo Street", houseNumber: String(index + 1), postalCode: "1011AA", city: "Amsterdam", countryCode: "NL" },
    items: [{ ean: demoProducts[index % demoProducts.length]?.ean ?? "0195949018551", productTitle: model, supplierSku: demoSupplierProducts[index % demoSupplierProducts.length]?.supplierSku ?? "FW-DEMO", quantity: 1, unitSellCents: sell, unitCostCents: cost }],
    trackingCode: status === "shipped" ? `3SDEMO${index + 1}` : null,
    carrier: status === "shipped" ? "PostNL" : null,
    totalSellCents: sell,
    totalCostCents: cost,
    profitCents: sell - cost,
    status,
    createdAt: index < 3 ? minutesAgo(index * 90 + 30) : daysAgo(index - 2),
    updatedAt: minutesAgo(index * 18),
  };
});

export const demoSyncLogs: SyncLog[] = [
  { id: "sync-1", syncType: "price_stock_sync", channel: "bol_nl", supplier: "foxway", startedAt: minutesAgo(25), completedAt: minutesAgo(24), offersCreated: 0, offersUpdated: 3, offersPaused: 0, ordersProcessed: 0, errors: [], status: "success" },
  { id: "sync-2", syncType: "order_sync", channel: "bol_nl", supplier: "foxway", startedAt: minutesAgo(42), completedAt: minutesAgo(41), offersCreated: 0, offersUpdated: 0, offersPaused: 0, ordersProcessed: 2, errors: [], status: "success" },
  { id: "sync-3", syncType: "catalog_sync", channel: "bol_nl", supplier: "foxway", startedAt: minutesAgo(105), completedAt: minutesAgo(101), offersCreated: 1, offersUpdated: 4, offersPaused: 0, ordersProcessed: 0, errors: [{ ean: "0194253014495", message: "Approved EAN mapping is required before offer creation." }], status: "partial" },
  { id: "sync-4", syncType: "price_stock_sync", channel: "bol_nl", supplier: "foxway", startedAt: minutesAgo(138), completedAt: minutesAgo(137), offersCreated: 0, offersUpdated: 2, offersPaused: 1, ordersProcessed: 0, errors: [], status: "success" },
  { id: "sync-5", syncType: "order_sync", channel: "bol_nl", supplier: "foxway", startedAt: minutesAgo(162), completedAt: minutesAgo(161), offersCreated: 0, offersUpdated: 0, offersPaused: 0, ordersProcessed: 0, errors: [{ ean: "0194252707824", message: "Foxway SKU availability check timed out; the order remains pending." }], status: "partial" },
];

export const demoMappings: EanMapping[] = [
  { id: "map-15-pro", foxwayProductName: "Apple iPhone 15 Pro 256GB", foxwayColor: "Grey", ean: "0195949018551", bolTitle: "Apple iPhone 15 Pro 256GB Natural Titanium", confidence: "HIGH", approvedBy: "Mark", approvedAt: daysAgo(22), createdAt: daysAgo(24) },
  { id: "map-14", foxwayProductName: "Apple iPhone 14 128GB", foxwayColor: "Black", ean: "0194253408942", bolTitle: "Apple iPhone 14 128GB Midnight", confidence: "HIGH", approvedBy: "Mark", approvedAt: daysAgo(31), createdAt: daysAgo(33) },
  { id: "map-13", foxwayProductName: "Apple iPhone 13 128GB", foxwayColor: "Blue", ean: "0194252707824", bolTitle: "Apple iPhone 13 128GB Blue", confidence: "HIGH", approvedBy: "Mark", approvedAt: daysAgo(38), createdAt: daysAgo(40) },
  { id: "map-12", foxwayProductName: "Apple iPhone 12 64GB", foxwayColor: "Black", ean: "0194252033428", bolTitle: "Apple iPhone 12 64GB Black", confidence: "MEDIUM", approvedBy: null, approvedAt: null, createdAt: daysAgo(2) },
  { id: "map-se", foxwayProductName: "Apple iPhone SE (2022) 64GB", foxwayColor: "White", ean: null, bolTitle: null, confidence: "PENDING", approvedBy: null, approvedAt: null, createdAt: daysAgo(1) },
];

export const demoStockSettings: StockSettings = {
  buffer: 2,
  minToList: 3,
  deliveryPromise: "1-2 days",
};
