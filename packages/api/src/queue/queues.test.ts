// ─── Queue Tests ────────────────────────────────────────────
// These tests verify that our queues and helper functions work.
// They need Redis running (via Docker).

import { describe, it, expect, afterAll } from "vitest";
import {
  businessEventsQueue,
  agentTasksQueue,
  notificationsQueue,
  emitBusinessEvent,
  queueAgentTask,
  sendNotification,
} from "./queues.js";

// Clean up queues after tests
afterAll(async () => {
  await businessEventsQueue.close();
  await agentTasksQueue.close();
  await notificationsQueue.close();
});

describe("Queue Definitions", () => {
  it("should have 3 queues with correct names", () => {
    expect(businessEventsQueue.name).toBe("business-events");
    expect(agentTasksQueue.name).toBe("agent-tasks");
    expect(notificationsQueue.name).toBe("notifications");
  });
});

describe("emitBusinessEvent", () => {
  it("should add a job to the business-events queue", async () => {
    const job = await emitBusinessEvent("order.created", { orderId: 999 });
    expect(job).toBeDefined();

    // Verify the job data
    const fetched = await businessEventsQueue.getJob(job.id!);
    expect(fetched).not.toBeNull();
    expect(fetched!.data.type).toBe("order.created");
    expect(fetched!.data.orderId).toBe(999);
  });

  it("should add different event types", async () => {
    const job = await emitBusinessEvent("production.completed", { orderId: 42 });
    const fetched = await businessEventsQueue.getJob(job.id!);
    expect(fetched!.data.type).toBe("production.completed");
  });
});

describe("queueAgentTask", () => {
  it("should add a job to the agent-tasks queue", async () => {
    const job = await queueAgentTask("review-artisan-assignment", { orderId: 5 });
    expect(job).toBeDefined();

    const fetched = await agentTasksQueue.getJob(job.id!);
    expect(fetched!.data.taskType).toBe("review-artisan-assignment");
    expect(fetched!.data.orderId).toBe(5);
  });
});

describe("sendNotification", () => {
  it("should add a job to the notifications queue", async () => {
    const job = await sendNotification("dashboard", "Test notification", { extra: "data" });
    expect(job).toBeDefined();

    const fetched = await notificationsQueue.getJob(job.id!);
    expect(fetched!.data.channel).toBe("dashboard");
    expect(fetched!.data.message).toBe("Test notification");
    expect(fetched!.data.extra).toBe("data");
  });
});
