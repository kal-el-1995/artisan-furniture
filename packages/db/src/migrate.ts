import dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(import.meta.dirname, "../../../.env") });
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set. Check your .env file.");
}

// Use a separate connection for migrations (max 1 connection)
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function runMigrations() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete!");
  await client.end();
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
