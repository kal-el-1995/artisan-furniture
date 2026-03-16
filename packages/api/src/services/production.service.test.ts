import { describe, it, expect } from "vitest";
import {
  listProductionTasks,
  getProductionTaskById,
  updateProductionStatus,
} from "./production.service.js";

describe("Production Service", () => {
  it("should list all production tasks", async () => {
    const tasks = await listProductionTasks();
    expect(tasks.length).toBeGreaterThanOrEqual(8);
  });

  it("should get a task with its order item and artisan", async () => {
    const task = await getProductionTaskById(3);
    expect(task).not.toBeNull();
    expect(task!.status).toBe("in_progress");
    expect(task!.artisan).toBeDefined();
    expect(task!.artisan.name).toBe("Arjun Mehta");
    expect(task!.orderItem).toBeDefined();
    expect(task!.orderItem.productType).toBe("bookshelf");
  });

  it("should return null for non-existent task", async () => {
    const task = await getProductionTaskById(99999);
    expect(task).toBeNull();
  });

  it("should update a task status", async () => {
    // Task 4 is "assigned" — move to "in_progress"
    const updated = await updateProductionStatus({
      id: 4,
      status: "in_progress",
    });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("in_progress");
    expect(updated!.startedAt).toBeDefined(); // should be auto-set
  });
});
