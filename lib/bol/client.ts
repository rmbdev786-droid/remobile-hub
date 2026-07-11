import { APP_CONFIG, isBolConfigured } from "@/lib/config";
import { demoOffers, demoOrders } from "@/lib/db/demo-data";
import type { BolOffer, BolOrder, ChannelOffer, OfferView } from "@/types";

export interface BolOfferInput {
  ean: string;
  conditionGrade: "B" | "C";
  conditionComment: string;
  sellPriceCents: number;
  stock: number;
}

export interface BolOfferUpdate {
  sellPriceCents?: number;
  stock?: number;
  conditionGrade?: "B" | "C";
  conditionComment?: string;
}

export interface BolShipmentInput {
  orderItemId: string;
  quantity: number;
  shipmentReference: string;
  transport: {
    transporterCode: string;
    trackAndTrace: string;
  };
}

export interface BolNotForSaleReason {
  code: string;
  description: string;
}

export interface CompetingOffer {
  ean: string;
  bestPriceCents: number | null;
  isWinning: boolean | null;
}

interface BolTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

export class BolApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "BolApiError";
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function euros(cents: number): number {
  if (!Number.isInteger(cents)) throw new TypeError("Marketplace money must originate as integer cents.");
  return Number((cents / 100).toFixed(2));
}

export function buildBolOfferPayload(input: BolOfferInput) {
  return {
    ean: input.ean,
    condition: {
      category: "REFURBISHED" as const,
      grade: input.conditionGrade,
      comment: input.conditionComment,
      margin: true as const,
    },
    reference: input.ean,
    onHoldByRetailer: false,
    unknownProductTitle: "",
    fulfillment: { method: "FBR" as const, deliveryCode: "1-2d" as const },
    pricing: { bundlePrices: [{ quantity: 1, unitPrice: euros(input.sellPriceCents) }] },
    stock: { amount: Math.max(0, Math.trunc(input.stock)), managedByRetailer: true },
  };
}

function toMockBolOffer(offer: ChannelOffer): BolOffer {
  return {
    offerId: offer.channelOfferId ?? offer.id,
    ean: `871${offer.id.replace(/\D/g, "").padEnd(10, "0").slice(0, 10)}`,
    condition: {
      category: "REFURBISHED",
      grade: offer.bolGrade,
      margin: true,
    },
    pricing: { bundlePrices: [{ quantity: 1, unitPrice: (offer.sellPriceCents ?? 0) / 100 }] },
    stock: { amount: offer.stockListed ?? 0, managedByRetailer: true },
    fulfilment: { method: "FBR", schedule: "1-2d" },
    countryAvailabilities: [{ countryCode: "NL" }],
    reference: offer.id,
  };
}

export class BolClient {
  private token: CachedToken | null = null;
  private readonly maxAttempts = 4;

  constructor(
    private readonly clientId: string | undefined = process.env.BOL_CLIENT_ID,
    private readonly clientSecret: string | undefined = process.env.BOL_CLIENT_SECRET,
    private readonly apiBaseUrl: string = APP_CONFIG.bolApiBaseUrl,
    private readonly tokenUrl: string = APP_CONFIG.bolTokenUrl,
  ) {}

  get isDemoMode(): boolean {
    return !this.clientId || !this.clientSecret || !isBolConfigured;
  }

  private async getAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new BolApiError("bol.com credentials are not configured.", 401, false);
    }
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;

    const authorization = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const response = await fetch(`${this.tokenUrl}?grant_type=client_credentials`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new BolApiError(`bol.com OAuth failed with HTTP ${response.status}.`, response.status, false);
    }
    const tokenResponse = (await response.json()) as BolTokenResponse;
    this.token = {
      value: tokenResponse.access_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1_000,
    };
    return this.token.value;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    version: 10 | 11 = 11,
  ): Promise<T> {
    for (let attempt = 0; attempt < this.maxAttempts; attempt += 1) {
      try {
        const token = await this.getAccessToken();
        const mediaType = `application/vnd.retailer.v${version}+json`;
        const response = await fetch(`${this.apiBaseUrl}${path}`, {
          ...init,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: mediaType,
            "Content-Type": mediaType,
            ...init.headers,
          },
          signal: AbortSignal.timeout(15_000),
        });

        if (response.ok) {
          if (response.status === 204) return undefined as T;
          return (await response.json()) as T;
        }

        if (response.status === 401 && attempt === 0) this.token = null;
        const retryable = response.status === 401 || response.status === 429 || response.status >= 500;
        if (!retryable || attempt === this.maxAttempts - 1) {
          throw new BolApiError(
            `bol.com request failed with HTTP ${response.status}.`,
            response.status,
            retryable,
          );
        }

        const retryAfter = Number(response.headers.get("retry-after"));
        await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : 500 * 2 ** attempt);
      } catch (error) {
        if (error instanceof BolApiError && !error.retryable) throw error;
        if (attempt === this.maxAttempts - 1) {
          if (error instanceof BolApiError) throw error;
          throw new BolApiError(
            error instanceof Error ? error.message : "bol.com request failed.",
            503,
            true,
          );
        }
        await wait(500 * 2 ** attempt);
      }
    }
    throw new BolApiError("bol.com request exhausted all retry attempts.", 503, true);
  }

  async createOffer(input: BolOfferInput): Promise<{ offerId: string }> {
    if (this.isDemoMode) return { offerId: `BOL-DEMO-${Date.now()}` };
    return this.request<{ offerId: string }>("/offers", {
      method: "POST",
      body: JSON.stringify(buildBolOfferPayload(input)),
    });
  }

  async updateOffer(offerId: string, update: BolOfferUpdate): Promise<void> {
    const condition = {
      category: "REFURBISHED" as const,
      grade: update.conditionGrade ?? "B",
      comment: update.conditionComment ?? "Professionally refurbished iPhone with a 2-year warranty.",
      margin: true as const,
    };
    if (this.isDemoMode) return;
    await this.request<void>(`/offers/${encodeURIComponent(offerId)}`, {
      method: "PUT",
      body: JSON.stringify({
        condition,
        ...(update.sellPriceCents === undefined
          ? {}
          : { pricing: { bundlePrices: [{ quantity: 1, unitPrice: euros(update.sellPriceCents) }] } }),
        ...(update.stock === undefined
          ? {}
          : { stock: { amount: Math.max(0, Math.trunc(update.stock)), managedByRetailer: true } }),
        fulfillment: { method: "FBR", deliveryCode: "1-2d" },
      }),
    });
  }

  async deleteOffer(offerId: string): Promise<void> {
    if (this.isDemoMode) return;
    await this.request<void>(`/offers/${encodeURIComponent(offerId)}`, { method: "DELETE" });
  }

  async getOffers(page = 1): Promise<BolOffer[]> {
    if (this.isDemoMode) return demoOffers.map(toMockBolOffer);
    const response = await this.request<{ offers: BolOffer[] }>(`/offers?page=${page}`);
    return response.offers;
  }

  async getOffer(offerId: string): Promise<BolOffer | null> {
    if (this.isDemoMode) {
      const offer = demoOffers.find((candidate) => candidate.channelOfferId === offerId || candidate.id === offerId);
      return offer ? toMockBolOffer(offer) : null;
    }
    return this.request<BolOffer>(`/offers/${encodeURIComponent(offerId)}`);
  }

  async getNotForSaleReasons(offerId: string): Promise<BolNotForSaleReason[]> {
    if (this.isDemoMode) return [];
    const response = await this.request<{ notForSaleReasons: BolNotForSaleReason[] }>(
      `/offers/${encodeURIComponent(offerId)}/not-for-sale-reasons`,
    );
    return response.notForSaleReasons;
  }

  async getCompetingOffer(ean: string): Promise<CompetingOffer> {
    if (this.isDemoMode) {
      const offer = demoOffers.find((candidate) => candidate.competitorPriceCents !== null);
      return {
        ean,
        bestPriceCents: offer?.competitorPriceCents ?? null,
        isWinning: offer?.buyBoxPosition === "WIN" ? true : offer ? false : null,
      };
    }
    const response = await this.request<{ offers: Array<{ price: number }> }>(
      "/insights/competing-offer",
      { method: "POST", body: JSON.stringify({ ean, condition: "REFURBISHED" }) },
      10,
    );
    const best = response.offers.at(0);
    return { ean, bestPriceCents: best ? Math.round(best.price * 100) : null, isWinning: null };
  }

  async getOrders(): Promise<BolOrder[]> {
    if (this.isDemoMode) {
      return demoOrders.map((order) => ({
        orderId: order.channelOrderId,
        orderPlacedDateTime: order.createdAt.toISOString(),
        shipmentDetails: {
          ...order.shippingAddress,
          firstName: order.customerName?.split(" ").at(0) ?? "Demo",
          surname: order.customerName?.split(" ").slice(1).join(" ") || "Customer",
          email: order.customerEmail ?? "demo@remobile.eu",
        },
        orderItems: order.items.map((item, index) => ({
          orderItemId: `${order.channelOrderId}-${index + 1}`,
          ean: item.ean,
          productTitle: item.productTitle,
          quantity: item.quantity,
          unitPrice: item.unitSellCents / 100,
          offerReference: item.supplierSku,
        })),
      }));
    }
    const response = await this.request<{ orders: BolOrder[] }>("/orders?fulfilment-method=FBR", {}, 10);
    return response.orders;
  }

  async getOrder(orderId: string): Promise<BolOrder | null> {
    if (this.isDemoMode) {
      return (await this.getOrders()).find((order) => order.orderId === orderId) ?? null;
    }
    return this.request<BolOrder>(`/orders/${encodeURIComponent(orderId)}`, {}, 10);
  }

  async shipOrder(orderId: string, shipment: BolShipmentInput): Promise<void> {
    if (this.isDemoMode) return;
    await this.request<void>(
      `/orders/${encodeURIComponent(orderId)}/shipment`,
      { method: "PUT", body: JSON.stringify({ shipmentItems: [shipment] }) },
      10,
    );
  }
}

export function buildBolOfferInputFromView(offer: OfferView): BolOfferInput {
  return {
    ean: offer.ean,
    conditionGrade: offer.bolGrade === "A" ? "B" : offer.bolGrade,
    conditionComment: `Professionally refurbished ${offer.productName} in ${offer.color}.`,
    sellPriceCents: offer.sellPriceCents ?? offer.minPriceCents ?? 0,
    stock: offer.stockListed ?? 0,
  };
}

export const bolClient = new BolClient();
