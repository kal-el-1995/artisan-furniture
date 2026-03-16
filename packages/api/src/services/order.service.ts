// ─── Order Service ──────────────────────────────────────────
// All order-related business logic lives here.
// Both REST routes and MCP tools call these functions.
// This is the "single source of truth" for order operations.

import { db, orders, orderItems, customers } from "@artisan/db";
import { eq, desc } from "drizzle-orm";
import { emitBusinessEvent } from "../queue/queues.js";

// ─── Types ──────────────────────────────────────────────────
// These describe the shape of data going in and out of the service.

// What you need to provide to create a new order
type CreateOrderInput = {
  customerId: number;
  orderType?: string;
  totalAmount?: string;
  depositAmount?: string;
  showroomNotes?: string;
};

// What you need to provide to update an order's status
type UpdateOrderStatusInput = {
  id: number;
  status:
    | "draft"
    | "confirmed"
    | "in_production"
    | "quality_check"
    | "ready_to_ship"
    | "in_transit"
    | "customs"
    | "delivered"
    | "completed";
};

// ─── Service Functions ──────────────────────────────────────

// Create a new order (starts in "draft" status)
export async function createOrder(input: CreateOrderInput) {
  const [order] = await db
    .insert(orders)
    .values({
      customerId: input.customerId,
      orderType: input.orderType ?? "custom",
      totalAmount: input.totalAmount,
      depositAmount: input.depositAmount,
      showroomNotes: input.showroomNotes,
    })
    .returning();

  // Emit event so the notification worker can alert the dashboard.
  // Note: production tasks are created when the order is CONFIRMED
  // (not here), because items haven't been added yet at creation time.
  await emitBusinessEvent("order.created", { orderId: order.id });

  return order;
}

// Get all orders, newest first
export async function listOrders() {
  const allOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt));

  return allOrders;
}

// Get a single order by its ID
// Returns the order + its customer info + its items
export async function getOrderById(id: number) {
  // Get the order
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id));

  if (!order) return null;

  // Get the customer who placed this order
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, order.customerId));

  // Get all items in this order
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id));

  return { ...order, customer, items };
}

// Update an order's status (e.g. draft → confirmed)
export async function updateOrderStatus(input: UpdateOrderStatusInput) {
  const [updated] = await db
    .update(orders)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, input.id))
    .returning();

  if (!updated) return null;

  // When an order is confirmed, tell the queue so the worker
  // can queue an AI agent task for artisan assignment review
  if (input.status === "confirmed") {
    await emitBusinessEvent("order.confirmed", { orderId: updated.id });
  }

  return updated;
}
