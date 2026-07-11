import { describe, expect, it } from "vitest";
import { BolClient, buildBolOfferPayload } from "@/lib/bol/client";
import { FoxwayClient } from "@/lib/foxway/client";

describe("API client fallbacks", () => {
  it("uses deterministic Foxway demo data when credentials are absent", async () => {
    const client = new FoxwayClient(undefined);
    expect(client.isDemoMode).toBe(true);
    expect((await client.getCatalogs())[0]?.urlSlug).toBe("iphone-demo");
    expect((await client.getCatalogProducts("iphone-demo")).length).toBeGreaterThan(0);
  });

  it("uses deterministic bol.com demo data when OAuth credentials are absent", async () => {
    const client = new BolClient(undefined, undefined);
    expect(client.isDemoMode).toBe(true);
    expect((await client.getOffers()).length).toBeGreaterThan(0);
    expect((await client.getOrders()).length).toBeGreaterThan(0);
  });

  it("always builds refurbished margin-product FBR payloads", () => {
    const payload = buildBolOfferPayload({
      ean: "4006381333931",
      conditionGrade: "B",
      conditionComment: "Professionally refurbished.",
      sellPriceCents: 44_500,
      stock: 4,
    });
    expect(payload.condition).toMatchObject({ category: "REFURBISHED", margin: true });
    expect(payload.fulfillment.method).toBe("FBR");
    expect(payload.pricing.bundlePrices[0]?.unitPrice).toBe(445);
  });
});
