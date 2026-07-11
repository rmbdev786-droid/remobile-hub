import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run migrations.");
}

const sql = neon(connectionString);
const migrationDb = drizzle(sql);

await migrate(migrationDb, { migrationsFolder: "./drizzle/migrations" });
console.log("Remobile Hub database migrations completed.");
