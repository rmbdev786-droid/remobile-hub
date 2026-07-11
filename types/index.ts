export type Channel = "bol_nl" | "bol_be";
export type Supplier = "foxway";
export type SupplierGrade = "Grade B" | "Grade C+" | "Grade C";
export type BolGrade = "A" | "B" | "C";
export type OfferStatus = "active" | "paused" | "deleted" | "error";
export type BuyBoxPosition = "WIN" | "LOSING" | "TIED" | "UNKNOWN";
export type SyncType = "catalog_sync" | "price_stock_sync" | "order_sync";
export type SyncStatus = "running" | "success" | "partial" | "failed";
export type Confidence = "HIGH" | "MEDIUM" | "LOW" | "NO_MATCH" | "MANUAL" | "PENDING";
export type OrderStatus = "pending" | "in_process" | "shipped" | "cancelled" | "error";

export interface Product {
  id: string;
  ean: string;
  brand: string | null;
  modelFamily: string | null;
  storage: string | null;
  color: string | null;
  category: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierProduct {
  id: string;
  productId: string | null;
  supplier: Supplier;
  supplierSku: string;
  productName: string;
  color: string;
  gradeRaw: SupplierGrade;
  costPriceCents: number;
  stockQty: number;
  additionalInfo: string | null;
  vatType: string | null;
  lastSyncedAt: Date | null;
  isActive: boolean;
}

export interface ChannelOffer {
  id: string;
  productId: string;
  supplierProductId: string;
  channel: Channel;
  channelOfferId: string | null;
  channelCondition: "REFURBISHED";
  bolGrade: BolGrade;
  isMarginProduct: true;
  sellPriceCents: number | null;
  priceOverride: boolean;
  minPriceCents: number | null;
  stockListed: number | null;
  status: OfferStatus;
  buyBoxPosition: BuyBoxPosition;
  competitorPriceCents: number | null;
  lastPriceUpdate: Date | null;
  lastStockUpdate: Date | null;
  createdAt: Date;
}

export interface PricingRule {
  id: string;
  channel: Channel;
  supplierGrade: SupplierGrade;
  marginPercent: string;
  roundToNearest: number;
  updatedAt: Date;
}

export interface ShippingAddress {
  street: string;
  houseNumber: string;
  houseNumberExtension?: string;
  postalCode: string;
  city: string;
  countryCode: string;
}

export interface OrderItem {
  ean: string;
  offerId?: string;
  productTitle: string;
  supplierSku: string;
  quantity: number;
  unitSellCents: number;
  unitCostCents: number;
}

export interface Order {
  id: string;
  channel: Channel;
  channelOrderId: string;
  foxwayReference: string | null;
  foxwayStatus: 1 | 2 | 3 | 4 | 5 | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  trackingCode: string | null;
  carrier: string | null;
  totalSellCents: number;
  totalCostCents: number;
  profitCents: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncError {
  ean: string;
  message: string;
}

export interface SyncLog {
  id: string;
  syncType: SyncType;
  channel: Channel | null;
  supplier: Supplier | null;
  startedAt: Date;
  completedAt: Date | null;
  offersCreated: number;
  offersUpdated: number;
  offersPaused: number;
  ordersProcessed: number;
  errors: SyncError[];
  status: SyncStatus;
}

export interface EanMapping {
  id: string;
  foxwayProductName: string;
  foxwayColor: string;
  ean: string | null;
  bolTitle: string | null;
  confidence: Confidence;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
}

export interface FoxwayProduct {
  sku: string;
  productName: string;
  appearance: SupplierGrade;
  color: string;
  additionalInfo: string;
  quantity: number;
  price: number;
  campaignPrice: number | null;
  vatType: string;
}

export interface Catalog {
  slug: string;
  name: string;
}

export interface DropshipOrderRequest {
  reference: string;
  recipient: {
    name: string;
    email: string;
    phone?: string;
    address: ShippingAddress;
  };
  lines: Array<{ sku: string; quantity: number }>;
}

export interface DropshipOrder {
  reference: string;
  status: 1 | 2 | 3 | 4 | 5;
  trackingCode?: string;
  carrier?: string;
  totalCents?: number;
}

export interface BolOffer {
  offerId: string;
  ean: string;
  condition: { category: "REFURBISHED"; grade?: BolGrade; margin: true };
  pricing: { bundlePrices: Array<{ quantity: number; unitPrice: number }> };
  stock: { amount: number; managedByRetailer: boolean };
  fulfilment: { method: string; schedule: string; deliveryPromise?: Record<string, unknown> };
  countryAvailabilities: Array<{ countryCode: string }>;
  reference: string;
}

export interface PricingResult {
  costPriceCents: number;
  sellPriceCents: number;
  marginEur: number;
  marginPct: number;
}

export interface SyncStats {
  created: number;
  updated: number;
  paused: number;
  noEan: number;
  errors: SyncError[];
}

export interface CompetingOffer {
  offerId: string;
  retailerName: string;
  priceCents: number;
  deliveryPromise: string;
  isBestOffer: boolean;
}

export interface BolOrder {
  orderId: string;
  orderPlacedDateTime: string;
  shipmentDetails: ShippingAddress & {
    firstName: string;
    surname: string;
    email: string;
  };
  orderItems: Array<{
    orderItemId: string;
    ean: string;
    productTitle: string;
    quantity: number;
    unitPrice: number;
    offerReference?: string;
  }>;
}

export interface ShipmentRequest {
  orderItems: Array<{ orderItemId: string; quantity: number }>;
  shipmentReference: string;
  transport: { transporterCode: string; trackAndTrace: string };
}

export interface StockSettings {
  buffer: number;
  minToList: number;
  deliveryPromise: "1-2 days" | "2-3 days" | "3-5 days";
}

export interface ChannelSettings {
  channel: Channel;
  connected: boolean;
  clientIdMasked: string;
  mode: "demo" | "live";
}

export interface DashboardSnapshot {
  totalRevenueCents: number;
  grossProfitCents: number;
  activeOffers: number;
  ordersToday: number;
  pendingOrders: number;
  buyBoxWinRate: number;
  foxwayCreditCents: number;
  foxwayAvailableCreditCents: number;
  lastSync: SyncLog | null;
  recentOrders: Order[];
  recentSyncs: SyncLog[];
}

export type MappingStatus = "mapped" | "pending" | "unmapped";

export interface CatalogEntry extends SupplierProduct {
  ean: string | null;
  mappingStatus: MappingStatus;
  mappingConfidence: Confidence;
  mappingId: string | null;
}

export interface OfferView extends ChannelOffer {
  ean: string;
  productName: string;
  supplierSku: string;
  color: string;
  storage: string | null;
  supplierGrade: SupplierGrade;
  costPriceCents: number;
  supplierStock: number;
}

export interface MappingApprovalInput {
  mappingId: string;
  ean: string;
  bolTitle: string | null;
  confidence: Confidence;
  approvedBy: string;
}
