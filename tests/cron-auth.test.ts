import { afterEach, describe, expect, it, vi } from "vitest";
import { validateCronSecret } from "@/lib/sync/auth";

afterEach(() => vi.unstubAllEnvs());

describe("cron authentication", () => {
  it("permits local execution when no secret is configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CRON_SECRET", "");
    expect(validateCronSecret(new Request("https://hub.test/api/cron/catalog"))).toBe(true);
  });

  it("rejects missing or incorrect credentials when a secret is configured", () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    expect(validateCronSecret(new Request("https://hub.test/api/cron/catalog"))).toBe(false);
    expect(validateCronSecret(new Request("https://hub.test/api/cron/catalog", {
      headers: { authorization: "Bearer wrong-secret" },
    }))).toBe(false);
  });

  it("accepts bearer and x-cron-secret authentication", () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    expect(validateCronSecret(new Request("https://hub.test/api/cron/catalog", {
      headers: { authorization: "Bearer correct-secret" },
    }))).toBe(true);
    expect(validateCronSecret(new Request("https://hub.test/api/cron/catalog", {
      headers: { "x-cron-secret": "correct-secret" },
    }))).toBe(true);
  });
});
