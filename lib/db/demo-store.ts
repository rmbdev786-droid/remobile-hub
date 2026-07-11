import {
  demoMappings,
  demoOffers,
  demoOrders,
  demoPricingRules,
  demoProducts,
  demoStockSettings,
  demoSupplierProducts,
  demoSyncLogs,
} from "./demo-data";
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

export interface DemoStore {
  products: Product[];
  supplierProducts: SupplierProduct[];
  offers: ChannelOffer[];
  pricingRules: PricingRule[];
  orders: Order[];
  syncLogs: SyncLog[];
  mappings: EanMapping[];
  stockSettings: StockSettings;
}

const createDemoStore = (): DemoStore => ({
  products: structuredClone(demoProducts),
  supplierProducts: structuredClone(demoSupplierProducts),
  offers: structuredClone(demoOffers),
  pricingRules: structuredClone(demoPricingRules),
  orders: structuredClone(demoOrders),
  syncLogs: structuredClone(demoSyncLogs),
  mappings: structuredClone(demoMappings),
  stockSettings: structuredClone(demoStockSettings),
});

const globalForDemoStore = globalThis as typeof globalThis & {
  remobileDemoStore?: DemoStore;
};

export const demoStore = globalForDemoStore.remobileDemoStore ?? createDemoStore();

if (process.env.NODE_ENV !== "production") {
  globalForDemoStore.remobileDemoStore = demoStore;
}
