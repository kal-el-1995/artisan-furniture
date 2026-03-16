import { Worker, Job } from "bullmq";
import { db, orderItems, productionTasks, artisans } from "@artisan/db";
import { eq } from "drizzle-orm";
import { createShipment } from "../services/logistics.service.js";
import { queueAgentTask, sendNotification } from "./queues.js";
import { getIO } from "../ws/socket.js";

// ── What are Workers? ───────────────────────────────────────────────
// Workers are background processes that watch a queue and do work
// whenever a new job arrives. Think of them like employees assigned
// to a mailbox — they wait for mail, then take action.
//
// We have 3 workers, one for each queue:
// 1. Business Event Worker — reacts to order/production/logistics events
// 2. Agent Task Worker — placeholder for AI agents (Phase 5)
// 3. Notification Worker — pushes updates to the dashboard

// ── Redis connection (same as queues.ts) ────────────────────────────
const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");

const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
};

// ═══════════════════════════════════════════════════════════════════
// 1. BUSINESS EVENT WORKER
// ═══════════════════════════════════════════════════════════════════
// This is the main automation engine. When something happens in the
// business (order created, production completed, etc.), this worker
// automatically triggers the next step.

const businessEventWorker = new Worker(
  "business-events",
  async (job: Job) => {
    const { type } = job.data;
    console.log(`  [Worker] Processing business event: ${type}`);

    switch (type) {
      // ── Order Created ───────────────────────────────────────
      // When a new order is created, notify the dashboard.
      // Production tasks are NOT created here because items
      // haven't been added yet (order starts as a draft).
      case "order.created": {
        const { orderId } = job.data;
        await sendNotification("dashboard", `New order #${orderId} created`);
        break;
      }

      // ── Order Confirmed ─────────────────────────────────────
      // When an order is confirmed (items are in place), create
      // production tasks for each item and queue an AI agent task.
      case "order.confirmed": {
        const { orderId } = job.data;

        // Find all items in this order
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, orderId));

        if (items.length === 0) {
          console.log(`  [Worker] Order ${orderId} has no items — skipping task creation`);
          break;
        }

        // Pick the first available artisan for now (simple POC logic).
        // In Phase 5, the AI agent will make smarter assignments.
        const [artisan] = await db
          .select()
          .from(artisans)
          .where(eq(artisans.active, true))
          .limit(1);

        if (!artisan) {
          console.log("  [Worker] No available artisans — cannot create tasks");
          break;
        }

        // Create a production task for each order item
        for (const item of items) {
          const [task] = await db
            .insert(productionTasks)
            .values({
              orderItemId: item.id,
              artisanId: artisan.id,
              status: "pending",
            })
            .returning();

          console.log(`  [Worker] Created production task #${task.id} for item #${item.id}`);
        }

        // Queue an AI agent task to review the artisan assignments
        await queueAgentTask("review-artisan-assignment", { orderId });

        // Notify the dashboard
        await sendNotification("dashboard", `Order #${orderId} confirmed — ${items.length} production task(s) created`);
        break;
      }

      // ── Production Completed ────────────────────────────────
      // When all production for an order is done, automatically
      // create a shipment to start the delivery process.
      case "production.completed": {
        const { orderId } = job.data;
        const shipment = await createShipment({
          orderId,
          type: "international",
          origin: "India",
          destination: "United States",
        });
        console.log(`  [Worker] Created shipment #${shipment.id} for order #${orderId}`);

        await sendNotification("dashboard", `Order #${orderId} production complete — shipment #${shipment.id} created`);
        break;
      }

      // ── Shipment Created ──────────────────────────────────────
      // Log for visibility. In production, this could trigger
      // tracking notifications to the customer.
      case "shipment.created": {
        const { orderId, shipmentId } = job.data;
        console.log(`  [Worker] Shipment #${shipmentId} created for order #${orderId}`);
        await sendNotification("dashboard", `Shipment created for order #${orderId}`);
        break;
      }

      default:
        console.log(`  [Worker] Unknown business event: ${type}`);
    }
  },
  { connection },
);

// ═══════════════════════════════════════════════════════════════════
// 2. AGENT TASK WORKER
// ═══════════════════════════════════════════════════════════════════
// Placeholder for Phase 5. For now, it just logs the task.
// When we add AI agents, this worker will call the LLM to process
// each task (e.g. review an order, assign an artisan, etc.)

const agentTaskWorker = new Worker(
  "agent-tasks",
  async (job: Job) => {
    const { taskType } = job.data;
    console.log(`  [Agent Worker] Received task: ${taskType}`);
    console.log(`  [Agent Worker] Data:`, JSON.stringify(job.data));
    // Phase 5: This is where the AI agent will process the task
  },
  { connection },
);

// ═══════════════════════════════════════════════════════════════════
// 3. NOTIFICATION WORKER
// ═══════════════════════════════════════════════════════════════════
// Pushes real-time updates to the dashboard via Socket.io.
// For POC, also logs to the console. In production, this could
// send emails (SendGrid), SMS (Twilio), etc.

const notificationWorker = new Worker(
  "notifications",
  async (job: Job) => {
    const { channel, message } = job.data;

    // Log to console (always, for visibility)
    console.log(`  [Notification] [${channel}] ${message}`);

    // Push to dashboard via Socket.io (if connected)
    const io = getIO();
    if (io) {
      io.emit("notification", { channel, message, timestamp: new Date().toISOString() });
    }
  },
  { connection },
);

// ── Error handling ──────────────────────────────────────────────────
// If a job fails, log the error. BullMQ will automatically retry
// failed jobs (default: 0 retries, but we can configure this later).

businessEventWorker.on("failed", (job, err) => {
  console.error(`  [Worker] Business event job ${job?.id} failed:`, err.message);
});

agentTaskWorker.on("failed", (job, err) => {
  console.error(`  [Worker] Agent task job ${job?.id} failed:`, err.message);
});

notificationWorker.on("failed", (job, err) => {
  console.error(`  [Worker] Notification job ${job?.id} failed:`, err.message);
});

// ── Graceful shutdown ───────────────────────────────────────────────
// When the server stops, close all workers cleanly so they finish
// any in-progress jobs before shutting down.

export async function closeWorkers() {
  await businessEventWorker.close();
  await agentTaskWorker.close();
  await notificationWorker.close();
  console.log("  [Workers] All workers shut down");
}

// Export for testing
export { businessEventWorker, agentTaskWorker, notificationWorker };
