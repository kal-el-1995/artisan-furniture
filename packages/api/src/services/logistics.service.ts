// ─── Logistics Service ──────────────────────────────────────
// Shipment management — tracking international and domestic deliveries.

import { db, shipments } from "@artisan/db";
import { eq, desc } from "drizzle-orm";
import { emitBusinessEvent } from "../queue/queues.js";

// Get all shipments, newest first
export async function listShipments() {
  return db.select().from(shipments).orderBy(desc(shipments.id));
}

// Get a single shipment by ID
export async function getShipmentById(id: number) {
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(eq(shipments.id, id));

  return shipment ?? null;
}

// Create a new shipment
type CreateShipmentInput = {
  orderId: number;
  type: "international" | "domestic";
  carrier?: string;
  trackingNumber?: string;
  origin?: string;
  destination?: string;
};

export async function createShipment(input: CreateShipmentInput) {
  const [shipment] = await db
    .insert(shipments)
    .values({
      orderId: input.orderId,
      type: input.type,
      carrier: input.carrier,
      trackingNumber: input.trackingNumber,
      origin: input.origin,
      destination: input.destination,
    })
    .returning();

  // Tell the queue a shipment was created
  await emitBusinessEvent("shipment.created", { orderId: input.orderId, shipmentId: shipment.id });

  return shipment;
}

// Update a shipment's status
type UpdateShipmentStatusInput = {
  id: number;
  status:
    | "preparing"
    | "picked_up"
    | "in_transit"
    | "customs_hold"
    | "customs_cleared"
    | "out_for_delivery"
    | "delivered";
};

export async function updateShipmentStatus(input: UpdateShipmentStatusInput) {
  const updates: Record<string, unknown> = { status: input.status };

  // Set actualArrival when delivered
  if (input.status === "delivered") {
    updates.actualArrival = new Date();
  }

  const [updated] = await db
    .update(shipments)
    .set(updates)
    .where(eq(shipments.id, input.id))
    .returning();

  return updated ?? null;
}
