import { describe, it, expect } from "vitest";
import {
  listPayments,
  getPaymentsByOrderId,
  createPayment,
} from "./payment.service.js";

describe("Payment Service", () => {
  it("should list all payments", async () => {
    const payments = await listPayments();
    expect(payments.length).toBeGreaterThanOrEqual(6);
  });

  it("should get payments for a specific order", async () => {
    // Order 1 has 2 payments (deposit + final)
    const payments = await getPaymentsByOrderId(1);
    expect(payments).toHaveLength(2);
    expect(payments[0].orderId).toBe(1);
  });

  it("should return empty array for order with no payments", async () => {
    const payments = await getPaymentsByOrderId(99999);
    expect(payments).toHaveLength(0);
  });

  it("should create a new payment", async () => {
    const payment = await createPayment({
      orderId: 2,
      type: "progress",
      amount: "1000.00",
      paymentMethod: "credit_card",
    });
    expect(payment).toBeDefined();
    expect(payment.status).toBe("processed");
    expect(payment.amount).toBe("1000.00");
    expect(payment.processedAt).toBeDefined();
  });
});
