import { APP_CONFIG, isFoxwayConfigured } from "@/lib/config";
import { demoSupplierProducts } from "@/lib/db/demo-data";
import type { FoxwayProduct, ShippingAddress } from "@/types";

export interface FoxwayOrderRequest {
  orderReference: string;
  shippingAddress: ShippingAddress;
  items: Array<{ sku: string; quantity: number }>;
}

export interface FoxwayCatalog {
  id: string;
  name: string;
  urlSlug: string;
}

export interface FoxwayCredit {
  creditLimitEur: number;
  availableCreditEur: number;
  currency: "EUR";
}

export interface FoxwayDropshipOrder {
  reference: string;
  status: number;
  trackingCode: string | null;
  carrier: string | null;
}

export class FoxwayApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "FoxwayApiError";
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function toMockFoxwayProducts(): FoxwayProduct[] {
  return demoSupplierProducts.map((product) => ({
    sku: product.supplierSku,
    productName: product.productName,
    color: product.color,
    appearance: product.gradeRaw,
    price: product.costPriceCents / 100,
    campaignPrice: product.supplierSku === "FW-IP15-128-BLK-B" ? 508 : null,
    quantity: product.stockQty,
    additionalInfo: product.additionalInfo ?? "",
    vatType: product.vatType ?? "",
  }));
}

export class FoxwayClient {
  private readonly maxAttempts = 3;

  constructor(
    private readonly apiKey: string | undefined = process.env.FOXWAY_API_KEY,
    private readonly baseUrl: string = APP_CONFIG.foxwayBaseUrl,
  ) {}

  get isDemoMode(): boolean {
    return !this.apiKey || !isFoxwayConfigured;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.apiKey) throw new FoxwayApiError("Foxway credentials are not configured.", 401, false);

    for (let attempt = 0; attempt < this.maxAttempts; attempt += 1) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...init,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
            ...init.headers,
          },
          signal: AbortSignal.timeout(15_000),
        });

        if (response.ok) {
          if (response.status === 204) return undefined as T;
          return (await response.json()) as T;
        }

        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || attempt === this.maxAttempts - 1) {
          throw new FoxwayApiError(
            `Foxway request failed with HTTP ${response.status}.`,
            response.status,
            retryable,
          );
        }
      } catch (error) {
        if (error instanceof FoxwayApiError && !error.retryable) throw error;
        if (attempt === this.maxAttempts - 1) {
          if (error instanceof FoxwayApiError) throw error;
          throw new FoxwayApiError(
            error instanceof Error ? error.message : "Foxway request failed.",
            503,
            true,
          );
        }
      }

      await wait(500 * 2 ** attempt);
    }

    throw new FoxwayApiError("Foxway request exhausted all retry attempts.", 503, true);
  }

  async getCatalogs(): Promise<FoxwayCatalog[]> {
    if (this.isDemoMode) {
      return [{ id: "demo-iphone", name: "Demo iPhone Catalog", urlSlug: "iphone-demo" }];
    }
    return this.request<FoxwayCatalog[]>("/catalogs");
  }

  async getCatalogProducts(catalogSlug: string): Promise<FoxwayProduct[]> {
    if (this.isDemoMode) return toMockFoxwayProducts();
    return this.request<FoxwayProduct[]>(`/catalogs/${encodeURIComponent(catalogSlug)}`);
  }

  async checkSkuAvailability(sku: string): Promise<FoxwayProduct | null> {
    if (this.isDemoMode) {
      return toMockFoxwayProducts().find((product) => product.sku === sku) ?? null;
    }
    return this.request<FoxwayProduct>(`/sku/${encodeURIComponent(sku)}`);
  }

  async getCreditLimit(): Promise<FoxwayCredit> {
    if (this.isDemoMode) {
      return { creditLimitEur: 100_000, availableCreditEur: 72_450, currency: "EUR" };
    }
    return this.request<FoxwayCredit>("/dropshipping/creditTerms");
  }

  async createDropshipOrder(order: FoxwayOrderRequest): Promise<FoxwayDropshipOrder> {
    if (this.isDemoMode) {
      return {
        reference: `FW-DEMO-${order.orderReference}`,
        status: 4,
        trackingCode: null,
        carrier: null,
      };
    }
    return this.request<FoxwayDropshipOrder>("/dropshipping/orders", {
      method: "POST",
      body: JSON.stringify(order),
    });
  }

  async getDropshipOrder(reference: string): Promise<FoxwayDropshipOrder> {
    if (this.isDemoMode) {
      return { reference, status: 4, trackingCode: "3SMOCK892341", carrier: "FedEx" };
    }
    return this.request<FoxwayDropshipOrder>(
      `/dropshipping/orders/${encodeURIComponent(reference)}`,
    );
  }

  async confirmPayment(reference: string): Promise<FoxwayDropshipOrder> {
    if (this.isDemoMode) {
      return { reference, status: 3, trackingCode: null, carrier: null };
    }
    return this.request<FoxwayDropshipOrder>(
      `/dropshipping/orders/${encodeURIComponent(reference)}/confirm-payment`,
      { method: "POST" },
    );
  }

  async cancelOrder(reference: string): Promise<FoxwayDropshipOrder> {
    if (this.isDemoMode) {
      return { reference, status: 5, trackingCode: null, carrier: null };
    }
    return this.request<FoxwayDropshipOrder>(
      `/dropshipping/orders/${encodeURIComponent(reference)}/cancel`,
      { method: "POST" },
    );
  }
}

export const foxwayClient = new FoxwayClient();
