// ─── Payment Service ────────────────────────────────────────
// Payment record management.
// For the POC, this is record-keeping only — no real payment processing.

import { db, payments } from "@artisan/db";
import { eq, desc } from "drizzle-orm";

// Get all payments, newest first
export async function listPayments() {
  return db.select().from(payments).orderBy(desc(payments.id));
}

// Get payments for a specific order
export async function getPaymentsByOrderId(orderId: number) {
  return db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId));
}

// Record a new payment
type CreatePaymentInput = {
  orderId: number;
  type: "deposit" | "progress" | "final" | "refund";
  amount: string;
  paymentMethod?: string;
};

export async function createPayment(input: CreatePaymentInput) {
  const [payment] = await db
    .insert(payments)
    .values({
      orderId: input.orderId,
      type: input.type,
      amount: input.amount,
      status: "processed",
      paymentMethod: input.paymentMethod,
      processedAt: new Date(),
    })
    .returning();

  return payment;
}
