// ─── Order Service Tests ────────────────────────────────────
// These tests verify that our order service functions work correctly.
// They talk to the REAL database (PostgreSQL running in Docker),
// so Docker must be running when you run these tests.
//
// Run with: pnpm test (from the project root)

import { describe, it, expect } from "vitest";
import {
  createOrder,
  listOrders,
  getOrderById,
  updateOrderStatus,
} from "./order.service.js";

// ─── describe() groups related tests together ───────────────
// Think of it like a folder for tests about the same topic.

describe("Order Service", () => {
  // ─── createOrder ────────────────────────────────────────
  describe("createOrder", () => {
    it("should create a new order with draft status", async () => {
      // Create an order for customer 1 (Sarah Chen from our seed data)
      const order = await createOrder({
        customerId: 1,
        orderType: "custom",
        totalAmount: "1500.00",
        showroomNotes: "Test order from automated tests",
      });

      // Check that the order was created with the right values
      expect(order).toBeDefined();
      expect(order.id).toBeTypeOf("number");
      expect(order.customerId).toBe(1);
      expect(order.status).toBe("draft"); // new orders always start as draft
      expect(order.orderType).toBe("custom");
      expect(order.totalAmount).toBe("1500.00");
      expect(order.showroomNotes).toBe("Test order from automated tests");
    });

    it("should default orderType to 'custom' when not provided", async () => {
      const order = await createOrder({
        customerId: 2,
        totalAmount: "2000.00",
      });

      expect(order.orderType).toBe("custom");
    });
  });

  // ─── listOrders ─────────────────────────────────────────
  describe("listOrders", () => {
    it("should return all orders, newest first", async () => {
      const orders = await listOrders();

      // We have 8 seed orders + the 2 we just created above = at least 10
      expect(orders.length).toBeGreaterThanOrEqual(10);

      // Check they're sorted newest first (first order's date >= second order's date)
      const firstDate = new Date(orders[0].createdAt).getTime();
      const secondDate = new Date(orders[1].createdAt).getTime();
      expect(firstDate).toBeGreaterThanOrEqual(secondDate);
    });
  });

  // ─── getOrderById ──────────────────────────────────────
  describe("getOrderById", () => {
    it("should return an order with its customer and items", async () => {
      // Order 2 is Michael's bookshelf + coffee table (from seed data)
      const order = await getOrderById(2);

      expect(order).not.toBeNull();
      // The order itself
      expect(order!.id).toBe(2);
      expect(order!.status).toBe("in_production");

      // The customer should be included
      expect(order!.customer).toBeDefined();
      expect(order!.customer.name).toBe("Michael Torres");

      // The items should be included (bookshelf + coffee table = 2 items)
      expect(order!.items).toHaveLength(2);
      expect(order!.items[0].productType).toBe("bookshelf");
    });

    it("should return null for a non-existent order", async () => {
      const order = await getOrderById(99999);
      expect(order).toBeNull();
    });
  });

  // ─── updateOrderStatus ────────────────────────────────
  describe("updateOrderStatus", () => {
    it("should update an order's status", async () => {
      // Create a fresh order to update
      const order = await createOrder({
        customerId: 3,
        totalAmount: "500.00",
      });

      // Update it from draft → confirmed
      const updated = await updateOrderStatus({
        id: order.id,
        status: "confirmed",
      });

      expect(updated).not.toBeNull();
      expect(updated!.id).toBe(order.id);
      expect(updated!.status).toBe("confirmed");

      // updatedAt should be more recent than createdAt
      const createdTime = new Date(updated!.createdAt).getTime();
      const updatedTime = new Date(updated!.updatedAt).getTime();
      expect(updatedTime).toBeGreaterThanOrEqual(createdTime);
    });

    it("should return null for a non-existent order", async () => {
      const result = await updateOrderStatus({
        id: 99999,
        status: "confirmed",
      });
      expect(result).toBeNull();
    });
  });
});
