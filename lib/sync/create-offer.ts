import { bolClient } from "@/lib/bol/client";
import {
  ensureProductForEan,
  findActiveOfferBySupplierProduct,
  listPricingRules,
  saveChannelOffer,
} from "@/lib/db/repository";
import { calculateSellPrice, calculateStock } from "@/lib/pricing/engine";
import { GRADE_MAPPING } from "@/lib/config";
import type { SupplierProduct } from "@/types";

export async function createOfferForApprovedEan(
  supplierProduct: SupplierProduct,
  ean: string,
): Promise<{ created: boolean; offerId: string | null }> {
  const existing = await findActiveOfferBySupplierProduct(supplierProduct.id);
  if (existing) return { created: false, offerId: existing.channelOfferId };

  const rules = await listPricingRules();
  const rule = rules.find((candidate) => candidate.supplierGrade === supplierProduct.gradeRaw);
  if (!rule) throw new Error(`No pricing rule exists for ${supplierProduct.gradeRaw}.`);

  const margin = Number(rule.marginPercent) / 100;
  const pricing = calculateSellPrice(
    supplierProduct.costPriceCents / 100,
    margin,
    rule.roundToNearest,
  );
  const minimum = calculateSellPrice(
    supplierProduct.costPriceCents / 100,
    0.1,
    rule.roundToNearest,
  );
  const stock = calculateStock(supplierProduct.stockQty);
  const bolGrade = GRADE_MAPPING[supplierProduct.gradeRaw];
  const channelOffer = await bolClient.createOffer({
    ean,
    conditionGrade: bolGrade === "A" ? "B" : bolGrade,
    conditionComment: `Professionally refurbished ${supplierProduct.productName} in ${supplierProduct.color}.`,
    sellPriceCents: pricing.sellPriceCents,
    stock,
  });
  const product = await ensureProductForEan(ean, supplierProduct);

  await saveChannelOffer({
    id: crypto.randomUUID(),
    productId: product.id,
    supplierProductId: supplierProduct.id,
    channelOfferId: channelOffer.offerId,
    bolGrade,
    sellPriceCents: pricing.sellPriceCents,
    minPriceCents: minimum.sellPriceCents,
    stockListed: stock,
  });

  return { created: true, offerId: channelOffer.offerId };
}
