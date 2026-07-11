import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { isUsableDatabaseUrl } from "./database-url";

const connectionString = process.env.DATABASE_URL;
const sql = isUsableDatabaseUrl(connectionString) ? neon(connectionString) : null;

export const db: NeonHttpDatabase<typeof schema> | null = sql
  ? drizzle(sql, { schema })
  : null;

export const databaseMode = db ? "neon" : "demo";

export function requireDb(): NeonHttpDatabase<typeof schema> {
  if (!db) {
    throw new Error("DATABASE_URL is required for this operation. The application is currently in demo mode.");
  }

  return db;
}
