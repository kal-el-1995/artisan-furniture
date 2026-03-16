import { Queue } from "bullmq";

// ── Redis connection ────────────────────────────────────────────────
// BullMQ needs to know where Redis is running.
// We parse the REDIS_URL from our .env file (e.g. "redis://localhost:6379")
// and extract the host and port that BullMQ expects.

const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");

const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
};

// ── Queue Definitions ───────────────────────────────────────────────
// We have 3 queues, each for a different type of work:
//
// 1. business-events  — Things that happened in the business
//    Examples: "order.created", "production.completed"
//    Workers react to these by creating follow-up tasks automatically.
//
// 2. agent-tasks      — Work items for AI agents (Phase 5)
//    Examples: "assign artisan to order", "review order details"
//    For now we just queue them; agents will process them later.
//
// 3. notifications    — Updates to push to the dashboard
//    Examples: "new order placed", "escalation needs review"
//    For POC, these log to the console. Later: email, SMS, etc.

export const businessEventsQueue = new Queue("business-events", { connection });
export const agentTasksQueue = new Queue("agent-tasks", { connection });
export const notificationsQueue = new Queue("notifications", { connection });

// ── Helper Functions ────────────────────────────────────────────────
// These make it easy to add jobs from anywhere in the codebase.
// Instead of importing the queue directly, you just call:
//   emitBusinessEvent("order.created", { orderId: "123" })

type BusinessEventType =
  | "order.created"
  | "order.confirmed"
  | "order.cancelled"
  | "production.started"
  | "production.completed"
  | "shipment.created"
  | "shipment.delivered";

export async function emitBusinessEvent(
  type: BusinessEventType,
  data: Record<string, unknown>,
) {
  return businessEventsQueue.add(type, { type, ...data });
}

export async function queueAgentTask(
  taskType: string,
  data: Record<string, unknown>,
) {
  return agentTasksQueue.add(taskType, { taskType, ...data });
}

export async function sendNotification(
  channel: string,
  message: string,
  data?: Record<string, unknown>,
) {
  return notificationsQueue.add(channel, { channel, message, ...data });
}
