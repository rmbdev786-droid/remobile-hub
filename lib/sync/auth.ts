import { timingSafeEqual } from "node:crypto";

export function validateCronSecret(request: Request): boolean {
  const configured = process.env.CRON_SECRET;
  if (!configured) return process.env.NODE_ENV !== "production";

  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const fallbackHeader = request.headers.get("x-cron-secret") ?? "";
  const received = header || fallbackHeader;
  if (!received) return false;

  const expectedBytes = Buffer.from(configured);
  const receivedBytes = Buffer.from(received);
  return (
    expectedBytes.length === receivedBytes.length &&
    timingSafeEqual(expectedBytes, receivedBytes)
  );
}
