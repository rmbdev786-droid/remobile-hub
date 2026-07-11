import type { FoxwayProduct, PricingResult } from "@/types";

const VAT_RATE = 0.21;

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite, non-negative number.`);
  }
}

export function effectiveFoxwayCost(product: FoxwayProduct): number {
  return product.campaignPrice !== null && product.campaignPrice > 0
    ? product.campaignPrice
    : product.price;
}

export function calculateSellPrice(
  costEur: number,
  marginPercent: number,
  roundToNearest: number = 5,
): PricingResult {
  assertFiniteNonNegative(costEur, "Cost");
  if (!Number.isFinite(marginPercent) || marginPercent < 0 || marginPercent >= 1) {
    throw new RangeError("Margin percent must be at least 0 and lower than 1.");
  }
  if (!Number.isFinite(roundToNearest) || roundToNearest <= 0) {
    throw new RangeError("Round increment must be greater than 0.");
  }

  const sellExVat = costEur / (1 - marginPercent);
  const sellInclVat = sellExVat * (1 + VAT_RATE);
  const roundedSellEur = Math.ceil(sellInclVat / roundToNearest) * roundToNearest;
  const sellPriceCents = Math.round(roundedSellEur * 100);
  const roundedSellExVat = roundedSellEur / (1 + VAT_RATE);
  const marginEur = Number((roundedSellExVat - costEur).toFixed(2));
  const realizedMargin = roundedSellExVat === 0 ? 0 : marginEur / roundedSellExVat;

  return {
    costPriceCents: Math.round(costEur * 100),
    sellPriceCents,
    marginEur,
    marginPct: Number(realizedMargin.toFixed(4)),
  };
}

export function aggregateFoxwayVariants(
  variants: FoxwayProduct[],
): { totalStock: number; bestCostEur: number } {
  if (variants.length === 0) {
    return { totalStock: 0, bestCostEur: 0 };
  }

  return variants.reduce(
    (aggregate, variant) => ({
      totalStock: aggregate.totalStock + Math.max(0, Math.trunc(variant.quantity)),
      bestCostEur: Math.min(aggregate.bestCostEur, effectiveFoxwayCost(variant)),
    }),
    { totalStock: 0, bestCostEur: Number.POSITIVE_INFINITY },
  );
}

function normalizeVariantName(product: FoxwayProduct): string {
  return product.productName
    .replace(/brand\s+new\s+battery/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export interface AggregatedFoxwayGroup {
  key: string;
  productName: string;
  color: string;
  grade: FoxwayProduct["appearance"];
  representativeSku: string;
  totalStock: number;
  bestCostEur: number;
  variants: FoxwayProduct[];
}

export function groupFoxwayProducts(products: FoxwayProduct[]): AggregatedFoxwayGroup[] {
  const grouped = new Map<string, FoxwayProduct[]>();

  for (const product of products) {
    const key = [normalizeVariantName(product), product.color.toLowerCase(), product.appearance].join("|");
    const current = grouped.get(key) ?? [];
    current.push(product);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries()).map(([key, variants]) => {
    const representative = variants[0];
    if (!representative) throw new Error("A grouped Foxway variant set cannot be empty.");
    const aggregate = aggregateFoxwayVariants(variants);
    return {
      key,
      productName: representative.productName.replace(/brand\s+new\s+battery/gi, "").trim(),
      color: representative.color,
      grade: representative.appearance,
      representativeSku: representative.sku,
      totalStock: aggregate.totalStock,
      bestCostEur: aggregate.bestCostEur,
      variants,
    };
  });
}

export function calculateStock(
  foxwayQty: number,
  buffer: number = 2,
  minToList: number = 3,
): number {
  if (![foxwayQty, buffer, minToList].every(Number.isFinite)) {
    throw new RangeError("Stock inputs must be finite numbers.");
  }
  const available = Math.max(0, Math.trunc(foxwayQty) - Math.max(0, Math.trunc(buffer)));
  return available < Math.max(0, Math.trunc(minToList)) ? 0 : available;
}

export function shouldRecalculatePrice(priceOverride: boolean): boolean {
  return priceOverride === false;
}
