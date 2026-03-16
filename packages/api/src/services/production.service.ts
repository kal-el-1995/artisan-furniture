// ─── Production Service ─────────────────────────────────────
// Production task management.
// Handles manufacturing work units assigned to artisans.

import { db, productionTasks, orderItems, artisans } from "@artisan/db";
import { eq, desc } from "drizzle-orm";
import { emitBusinessEvent } from "../queue/queues.js";

// Get all production tasks, newest first
export async function listProductionTasks() {
  return db
    .select()
    .from(productionTasks)
    .orderBy(desc(productionTasks.id));
}

// Get a single production task by ID, with its order item and artisan info
export async function getProductionTaskById(id: number) {
  const [task] = await db
    .select()
    .from(productionTasks)
    .where(eq(productionTasks.id, id));

  if (!task) return null;

  const [item] = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.id, task.orderItemId));

  const [artisan] = await db
    .select()
    .from(artisans)
    .where(eq(artisans.id, task.artisanId));

  return { ...task, orderItem: item, artisan };
}

// Update a production task's status
type UpdateProductionStatusInput = {
  id: number;
  status:
    | "pending"
    | "assigned"
    | "in_progress"
    | "quality_check"
    | "approved"
    | "rejected"
    | "rework";
  qualityCheckStatus?: string;
  qualityNotes?: string;
};

export async function updateProductionStatus(input: UpdateProductionStatusInput) {
  const updates: Record<string, unknown> = { status: input.status };

  // Set startedAt when moving to in_progress (if not already set)
  if (input.status === "in_progress") {
    updates.startedAt = new Date();
  }

  // Set completedAt when approved or rejected
  if (input.status === "approved" || input.status === "rejected") {
    updates.completedAt = new Date();
  }

  if (input.qualityCheckStatus) {
    updates.qualityCheckStatus = input.qualityCheckStatus;
  }
  if (input.qualityNotes) {
    updates.qualityNotes = input.qualityNotes;
  }

  const [updated] = await db
    .update(productionTasks)
    .set(updates)
    .where(eq(productionTasks.id, input.id))
    .returning();

  if (!updated) return null;

  // When a task is approved, check if ALL tasks for this order are done.
  // If so, emit "production.completed" so the worker creates a shipment.
  if (input.status === "approved") {
    // Find which order this task belongs to (task → orderItem → order)
    const [item] = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.id, updated.orderItemId));

    if (item) {
      // Get all tasks for items in this order
      const allItems = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, item.orderId));

      const allItemIds = allItems.map((i) => i.id);

      const allTasks = await db
        .select()
        .from(productionTasks)
        .where(eq(productionTasks.orderItemId, allItemIds[0]!));

      // For orders with multiple items, fetch tasks for all items
      const tasksForOrder: typeof allTasks = [];
      for (const itemId of allItemIds) {
        const tasks = await db
          .select()
          .from(productionTasks)
          .where(eq(productionTasks.orderItemId, itemId));
        tasksForOrder.push(...tasks);
      }

      // Check if every task is approved
      const allApproved = tasksForOrder.every((t) => t.status === "approved");
      if (allApproved) {
        await emitBusinessEvent("production.completed", { orderId: item.orderId });
      }
    }
  }

  return updated;
}
