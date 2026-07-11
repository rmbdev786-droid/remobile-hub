import { describe, expect, it } from "vitest";
import { isUsableDatabaseUrl } from "../lib/db/database-url";

describe("database URL validation", () => {
  it("accepts complete PostgreSQL and postgres connection strings", () => {
    expect(isUsableDatabaseUrl("postgresql://user:secret@db.example.com/remobile?sslmode=require")).toBe(true);
    expect(isUsableDatabaseUrl("postgres://user:secret@db.example.com/remobile")).toBe(true);
  });

  it("rejects missing and managed placeholder values without throwing", () => {
    expect(isUsableDatabaseUrl(undefined)).toBe(false);
    expect(isUsableDatabaseUrl("DATABASE_URL")).toBe(false);
    expect(isUsableDatabaseUrl("https://db.example.com/remobile")).toBe(false);
    expect(isUsableDatabaseUrl("postgresql://host-only/remobile")).toBe(false);
  });
});
