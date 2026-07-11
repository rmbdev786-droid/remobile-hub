import { NextResponse } from "next/server";
import { z } from "zod";
import { bolClient } from "@/lib/bol/client";
import { getOffer, setOfferPrice } from "@/lib/db/repository";

const priceSchema = z.object({ sellPriceCents: z.number().int().positive() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const input = priceSchema.parse(await request.json());
  const offer = await getOffer(id);
  if (!offer) return NextResponse.json({ error: "Offer not found." }, { status: 404 });
  if (!offer.channelOfferId) return NextResponse.json({ error: "Offer is not connected to bol.com." }, { status: 409 });
  await bolClient.updateOffer(offer.channelOfferId, { sellPriceCents: input.sellPriceCents, conditionGrade: offer.bolGrade === "A" ? "B" : offer.bolGrade });
  return NextResponse.json(await setOfferPrice(id, input.sellPriceCents));
}
