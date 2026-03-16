import dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(import.meta.dirname, "../../../.env") });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Read the database URL from .env
// Example: postgresql://artisan:artisan_secret@localhost:5432/artisan_furniture
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set. Check your .env file.");
}

// Create the PostgreSQL connection
const client = postgres(connectionString);

// Create the Drizzle ORM instance — this is what we use to query the database
export const db = drizzle(client, { schema });

// Re-export everything so other packages can import from @artisan/db
export * from "./schema";
export * from "./enums";
