// ─── Customer Service ───────────────────────────────────────
// Customer-related business logic.
// For the POC, customers are read-only (created via seed data).

import { db, customers } from "@artisan/db";
import { eq } from "drizzle-orm";

// Get all customers
export async function listCustomers() {
  return db.select().from(customers);
}

// Get a single customer by ID
export async function getCustomerById(id: number) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id));

  return customer ?? null;
}
