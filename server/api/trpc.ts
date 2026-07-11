import { auth, currentUser } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import { GRADE_MAPPING, isBolConfigured, isClerkConfigured, isFoxwayConfigured } from "@/lib/config";
import {
  approveGeneratedMapping,
  approveMapping,
  getDashboardSnapshot,
  getOffer,
  getStockSettings,
  listCatalog,
  listMappings,
  listOffers,
  listOrders,
  listPricingRules,
  listSyncLogs,
  resetOfferPrice,
  setOfferPrice,
  updatePricingRule,
  updateStockSettings,
} from "@/lib/db/repository";
import { validateEan13 } from "@/lib/ean/mapper";
import { bolClient } from "@/lib/bol/client";
import { foxwayClient } from "@/lib/foxway/client";
import { createOfferForApprovedEan } from "@/lib/sync/create-offer";
import { runCatalogSync, runOrderSync, runPriceStockSync } from "@/lib/sync";
import { marginPercentToFractionString } from "@/lib/pricing/margin-rule";

export interface TrpcUser {
  id: string;
  name: string;
  email: string | null;
  isDemo: boolean;
}

export async function createTRPCContext(): Promise<{ user: TrpcUser | null }> {
  if (!isClerkConfigured) {
    return {
      user: { id: "demo-operator", name: "Demo Operator", email: null, isDemo: true },
    };
  }

  const session = await auth();
  if (!session.userId) return { user: null };
  const clerkUser = await currentUser();
  return {
    user: {
      id: session.userId,
      name:
        [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
        clerkUser?.username ||
        "Operator",
      email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
      isDemo: false,
    },
  };
}

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const confidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW", "NO_MATCH", "MANUAL", "PENDING"]);

export const appRouter = router({
  dashboard: router({
    snapshot: protectedProcedure.query(() => getDashboardSnapshot()),
  }),
  catalog: router({
    list: protectedProcedure.query(() => listCatalog()),
    mappings: protectedProcedure.query(() => listMappings()),
    approveMapping: protectedProcedure
      .input(
        z.object({
          mappingId: z.string().min(1),
          ean: z.string().refine(validateEan13, "A valid EAN-13 is required."),
          bolTitle: z.string().nullable(),
          confidence: confidenceSchema,
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const mapping = await approveMapping({ ...input, approvedBy: ctx.user.id });
        const supplierProduct = (await listCatalog()).find(
          (item) =>
            item.productName === mapping.foxwayProductName &&
            item.color.toLowerCase() === mapping.foxwayColor.toLowerCase(),
        );
        const offer = supplierProduct
          ? await createOfferForApprovedEan(supplierProduct, input.ean)
          : { created: false, offerId: null };
        return { mapping, offer };
      }),
    approveGenerated: protectedProcedure
      .input(
        z.object({
          mappingId: z.string().optional(),
          foxwayProductName: z.string().min(1),
          foxwayColor: z.string().min(1),
          ean: z.string().refine(validateEan13, "A valid EAN-13 is required."),
          bolTitle: z.string().nullable(),
          confidence: confidenceSchema,
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const { mappingId, ...mappingInput } = input;
        const mapping = await approveGeneratedMapping({
          ...mappingInput,
          ...(mappingId ? { mappingId } : {}),
          approvedBy: ctx.user.id,
        });
        const supplierProduct = (await listCatalog()).find(
          item =>
            item.productName === input.foxwayProductName &&
            item.color.toLowerCase() === input.foxwayColor.toLowerCase(),
        );
        const offer = supplierProduct
          ? await createOfferForApprovedEan(supplierProduct, input.ean)
          : { created: false, offerId: null };
        return { mapping, offer };
      }),
  }),
  offers: router({
    list: protectedProcedure.query(() => listOffers()),
    updatePrice: protectedProcedure
      .input(z.object({ offerId: z.string().min(1), sellPriceCents: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const offer = await getOffer(input.offerId);
        if (!offer) throw new TRPCError({ code: "NOT_FOUND", message: "Offer not found." });
        if (!offer.channelOfferId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Offer is not connected to bol.com." });
        await bolClient.updateOffer(offer.channelOfferId, {
          sellPriceCents: input.sellPriceCents,
          conditionGrade: offer.bolGrade === "A" ? "B" : offer.bolGrade,
        });
        return setOfferPrice(input.offerId, input.sellPriceCents);
      }),
    resetPrice: protectedProcedure
      .input(z.object({ offerId: z.string().min(1) }))
      .mutation(({ input }) => resetOfferPrice(input.offerId)),
    suggestPrice: protectedProcedure
      .input(z.object({ offerId: z.string().min(1) }))
      .query(async ({ input }) => {
        const offer = await getOffer(input.offerId);
        if (!offer) throw new TRPCError({ code: "NOT_FOUND", message: "Offer not found." });
        const competitor = offer.competitorPriceCents ?? offer.sellPriceCents ?? offer.minPriceCents ?? 0;
        return {
          sellPriceCents: Math.max(offer.minPriceCents ?? 0, competitor - 500),
          floorPriceCents: offer.minPriceCents ?? 0,
        };
      }),
  }),
  orders: router({
    list: protectedProcedure.query(() => listOrders()),
    byId: protectedProcedure
      .input(z.object({ orderId: z.string().min(1) }))
      .query(async ({ input }) => {
        const order = (await listOrders()).find((candidate) => candidate.id === input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
        return order;
      }),
  }),
  sync: router({
    logs: protectedProcedure.query(() => listSyncLogs()),
    run: protectedProcedure
      .input(z.object({ type: z.enum(["catalog", "price_stock", "orders"]) }))
      .mutation(({ input }) => {
        if (input.type === "catalog") return runCatalogSync();
        if (input.type === "price_stock") return runPriceStockSync();
        return runOrderSync();
      }),
  }),
  settings: router({
    pricingRules: protectedProcedure.query(() => listPricingRules()),
    updatePricingRule: protectedProcedure
      .input(
        z.object({
          ruleId: z.string().min(1),
          marginPercent: z.number().min(0).max(95),
          roundToNearest: z.number().int().min(1).max(100),
        }),
      )
      .mutation(({ input }) =>
        updatePricingRule(
          input.ruleId,
          marginPercentToFractionString(input.marginPercent),
          input.roundToNearest,
        ),
      ),
    gradeMapping: protectedProcedure.query(() => GRADE_MAPPING),
    stock: protectedProcedure.query(() => getStockSettings()),
    updateStock: protectedProcedure
      .input(
        z.object({
          buffer: z.number().int().min(0).max(100),
          minToList: z.number().int().min(0).max(100),
          deliveryPromise: z.enum(["1-2 days", "2-3 days", "3-5 days"]),
        }),
      )
      .mutation(({ input }) => updateStockSettings(input)),
    connections: protectedProcedure.query(() => ({
      foxway: { connected: isFoxwayConfigured, demoMode: foxwayClient.isDemoMode },
      bol: { connected: isBolConfigured, demoMode: bolClient.isDemoMode },
    })),
    testConnection: protectedProcedure
      .input(z.object({ service: z.enum(["foxway", "bol"]) }))
      .mutation(async ({ input }) => {
        if (input.service === "foxway") {
          const catalogs = await foxwayClient.getCatalogs();
          return { ok: true, detail: `${catalogs.length} catalog${catalogs.length === 1 ? "" : "s"} available.` };
        }
        const offers = await bolClient.getOffers(1);
        return { ok: true, detail: `${offers.length} offer${offers.length === 1 ? "" : "s"} available.` };
      }),
  }),
  webhooks: router({
    bolStatus: protectedProcedure.query(() => ({ receiver: "ready", idempotency: "enabled" })),
  }),
});

export type AppRouter = typeof appRouter;
