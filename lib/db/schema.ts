import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { OrderItem, ShippingAddress, SyncError } from "@/types";

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  ean: varchar("ean", { length: 13 }).notNull().unique(),
  brand: varchar("brand", { length: 100 }),
  modelFamily: varchar("model_family", { length: 200 }),
  storage: varchar("storage", { length: 20 }),
  color: varchar("color", { length: 50 }),
  category: varchar("category", { length: 50 }),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const supplierProducts = pgTable(
  "supplier_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    supplier: varchar("supplier", { length: 50 }).notNull(),
    supplierSku: varchar("supplier_sku", { length: 100 }).notNull(),
    productName: varchar("product_name", { length: 300 }).notNull(),
    color: varchar("color", { length: 50 }).notNull(),
    gradeRaw: varchar("grade_raw", { length: 20 }).notNull(),
    costPriceCents: integer("cost_price_cents").notNull(),
    stockQty: integer("stock_qty").default(0).notNull(),
    additionalInfo: varchar("additional_info", { length: 200 }),
    vatType: varchar("vat_type", { length: 20 }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (table) => [uniqueIndex("supplier_sku_unique").on(table.supplier, table.supplierSku)],
);

export const channelOffers = pgTable("channel_offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  supplierProductId: uuid("supplier_product_id")
    .notNull()
    .references(() => supplierProducts.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 50 }).notNull(),
  channelOfferId: varchar("channel_offer_id", { length: 200 }),
  channelCondition: varchar("channel_condition", { length: 50 }).default("REFURBISHED").notNull(),
  bolGrade: varchar("bol_grade", { length: 1 }).notNull(),
  isMarginProduct: boolean("is_margin_product").default(true).notNull(),
  sellPriceCents: integer("sell_price_cents"),
  priceOverride: boolean("price_override").default(false).notNull(),
  minPriceCents: integer("min_price_cents"),
  stockListed: integer("stock_listed"),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  buyBoxPosition: varchar("buy_box_position", { length: 20 }).default("UNKNOWN").notNull(),
  competitorPriceCents: integer("competitor_price_cents"),
  lastPriceUpdate: timestamp("last_price_update", { withTimezone: true }),
  lastStockUpdate: timestamp("last_stock_update", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pricingRules = pgTable(
  "pricing_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    channel: varchar("channel", { length: 50 }).notNull(),
    supplierGrade: varchar("supplier_grade", { length: 20 }).notNull(),
    marginPercent: numeric("margin_percent", { precision: 5, scale: 4 }).notNull(),
    roundToNearest: integer("round_to_nearest").default(5).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("pricing_rule_unique").on(table.channel, table.supplierGrade)],
);

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  channel: varchar("channel", { length: 50 }).notNull(),
  channelOrderId: varchar("channel_order_id", { length: 200 }).notNull().unique(),
  foxwayReference: varchar("foxway_reference", { length: 200 }),
  foxwayStatus: integer("foxway_status"),
  customerName: varchar("customer_name", { length: 200 }),
  customerEmail: varchar("customer_email", { length: 200 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  shippingAddress: jsonb("shipping_address").$type<ShippingAddress>().notNull(),
  items: jsonb("items").$type<OrderItem[]>().notNull(),
  trackingCode: varchar("tracking_code", { length: 200 }),
  carrier: varchar("carrier", { length: 100 }),
  totalSellCents: integer("total_sell_cents").notNull(),
  totalCostCents: integer("total_cost_cents").notNull(),
  profitCents: integer("profit_cents").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const syncLog = pgTable("sync_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  syncType: varchar("sync_type", { length: 50 }).notNull(),
  channel: varchar("channel", { length: 50 }),
  supplier: varchar("supplier", { length: 50 }),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  offersCreated: integer("offers_created").default(0).notNull(),
  offersUpdated: integer("offers_updated").default(0).notNull(),
  offersPaused: integer("offers_paused").default(0).notNull(),
  ordersProcessed: integer("orders_processed").default(0).notNull(),
  errors: jsonb("errors").$type<SyncError[]>().default([]).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
});

export const eanMapping = pgTable(
  "ean_mapping",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    foxwayProductName: varchar("foxway_product_name", { length: 300 }).notNull(),
    foxwayColor: varchar("foxway_color", { length: 50 }).notNull(),
    ean: varchar("ean", { length: 13 }),
    bolTitle: varchar("bol_title", { length: 300 }),
    confidence: varchar("confidence", { length: 20 }).notNull(),
    approvedBy: varchar("approved_by", { length: 100 }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("ean_mapping_product_color_unique").on(table.foxwayProductName, table.foxwayColor)],
);

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
export type SupplierProductRow = typeof supplierProducts.$inferSelect;
export type NewSupplierProductRow = typeof supplierProducts.$inferInsert;
export type ChannelOfferRow = typeof channelOffers.$inferSelect;
export type NewChannelOfferRow = typeof channelOffers.$inferInsert;
export type PricingRuleRow = typeof pricingRules.$inferSelect;
export type NewPricingRuleRow = typeof pricingRules.$inferInsert;
export type OrderRow = typeof orders.$inferSelect;
export type NewOrderRow = typeof orders.$inferInsert;
export type SyncLogRow = typeof syncLog.$inferSelect;
export type NewSyncLogRow = typeof syncLog.$inferInsert;
export type EanMappingRow = typeof eanMapping.$inferSelect;
export type NewEanMappingRow = typeof eanMapping.$inferInsert;
