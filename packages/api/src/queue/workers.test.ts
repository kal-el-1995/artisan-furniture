// ─── Worker Integration Tests ───────────────────────────────
// These tests verify that the event-driven automation chain works:
// - Confirming an order → creates production tasks
// - Approving all production tasks → creates a shipment
//
// These are integration tests — they use the real database and Redis.

import { describe, it, expect, afterAll } from "vitest";
import { db, orders, orderItems, productionTasks, shipments, artisans } from "@artisan/db";
import { eq } from "drizzle-orm";
import { emitBusinessEvent, businessEventsQueue, agentTasksQueue, notificationsQueue } from "./queues.js";

// Import workers so they start processing
import { businessEventWorker, agentTaskWorker, notificationWorker } from "./workers.js";

// Helper: wait for a worker to finish processing a job
function waitForJob(ms = 2000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Clean up after all tests
afterAll(async () => {
  await businessEventWorker.close();
  await agentTaskWorker.close();
  await notificationWorker.close();
  await businessEventsQueue.close();
  await agentTasksQueue.close();
  await notificationsQueue.close();
});

describe("Business Event Worker", () => {
  it("order.confirmed should create production tasks for each item", async () => {
    // Step 1: Create a test order directly in the database
    const [order] = await db
      .insert(orders)
      .values({
        customerId: 1,
        orderType: "custom",
        totalAmount: "5000.00",
        showroomNotes: "Worker test order",
      })
      .returning();

    // Step 2: Add 2 items to the order
    await db.insert(orderItems).values([
      {
        orderId: order.id,
        productType: "test_table",
        description: "Test table for worker",
        quantity: 1,
        unitPrice: "3000.00",
        material: "teak",
      },
      {
        orderId: order.id,
        productType: "test_chair",
        description: "Test chair for worker",
        quantity: 1,
        unitPrice: "2000.00",
        material: "teak",
      },
    ]);

    // Step 3: Count production tasks before
    const tasksBefore = await db
      .select()
      .from(productionTasks)
      .where(eq(productionTasks.orderItemId, -1)); // just to get the type

    const allTasksBefore = await db.select().from(productionTasks);
    const countBefore = allTasksBefore.length;

    // Step 4: Emit order.confirmed event
    await emitBusinessEvent("order.confirmed", { orderId: order.id });

    // Step 5: Wait for the worker to process
    await waitForJob();

    // Step 6: Check that 2 new production tasks were created
    const allTasksAfter = await db.select().from(productionTasks);
    const countAfter = allTasksAfter.length;

    expect(countAfter).toBe(countBefore + 2);

    // Verify the new tasks belong to our order's items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    const itemIds = items.map((i) => i.id);

    for (const itemId of itemIds) {
      const [task] = await db
        .select()
        .from(productionTasks)
        .where(eq(productionTasks.orderItemId, itemId));

      expect(task).toBeDefined();
      expect(task.status).toBe("pending");
      expect(task.artisanId).toBeTypeOf("number");
    }
  });

  it("order.confirmed with no items should not create tasks", async () => {
    // Create an order with no items
    const [order] = await db
      .insert(orders)
      .values({
        customerId: 2,
        orderType: "custom",
        totalAmount: "0.00",
        showroomNotes: "Empty order test",
      })
      .returning();

    const tasksBefore = await db.select().from(productionTasks);

    await emitBusinessEvent("order.confirmed", { orderId: order.id });
    await waitForJob();

    const tasksAfter = await db.select().from(productionTasks);
    expect(tasksAfter.length).toBe(tasksBefore.length);
  });

  it("production.completed should create a shipment", async () => {
    // Create a test order
    const [order] = await db
      .insert(orders)
      .values({
        customerId: 3,
        orderType: "custom",
        totalAmount: "1000.00",
      })
      .returning();

    const shipmentsBefore = await db.select().from(shipments);

    // Emit production.completed
    await emitBusinessEvent("production.completed", { orderId: order.id });
    await waitForJob();

    // Check a new shipment was created
    const shipmentsAfter = await db.select().from(shipments);
    expect(shipmentsAfter.length).toBe(shipmentsBefore.length + 1);

    // The new shipment should be for our order
    const newShipment = shipmentsAfter.find((s) => s.orderId === order.id);
    expect(newShipment).toBeDefined();
    expect(newShipment!.type).toBe("international");
    expect(newShipment!.origin).toBe("India");
    expect(newShipment!.destination).toBe("United States");
  });
});
