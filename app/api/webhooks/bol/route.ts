import { NextResponse } from "next/server";
import { z } from "zod";

const receivedEventIds = new Set<string>();
const eventSchema = z.object({
  id: z.string().min(1).optional(),
  eventId: z.string().min(1).optional(),
  eventType: z.string().min(1).optional(),
  resource: z.string().optional(),
}).passthrough();

export async function POST(request: Request) {
  const expected = process.env.BOL_WEBHOOK_SECRET;
  if (expected && request.headers.get("x-bol-webhook-secret") !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const payload = eventSchema.parse(await request.json());
  const eventId = payload.eventId ?? payload.id ?? `${payload.eventType ?? "event"}:${payload.resource ?? "unknown"}`;
  if (receivedEventIds.has(eventId)) return NextResponse.json({ accepted: true, duplicate: true });
  receivedEventIds.add(eventId);
  if (receivedEventIds.size > 2_000) receivedEventIds.clear();

  return NextResponse.json({ accepted: true, duplicate: false }, { status: 202 });
}
