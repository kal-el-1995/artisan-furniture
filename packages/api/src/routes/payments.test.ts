// ─── Payment Route Tests ────────────────────────────────────

import { describe, it, expect, beforeAll } from "vitest";
import { buildApp, getAuthToken } from "../test-helpers.js";

let app: Awaited<ReturnType<typeof buildApp>>;
let token: string;

beforeAll(async () => {
  app = await buildApp();
  token = await getAuthToken(app);
});

describe("Payment Routes", () => {
  it("GET /api/payments — should list all payments", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/payments",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.length).toBeGreaterThanOrEqual(6);
  });

  it("GET /api/payments/order/:id — should return payments for an order", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/payments/order/1",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.length).toBe(2); // deposit + final
    expect(body[0].orderId).toBe(1);
  });

  it("POST /api/payments — should create a payment", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/payments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        orderId: 5,
        type: "deposit",
        amount: "2000.00",
        paymentMethod: "credit_card",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("processed");
    expect(body.amount).toBe("2000.00");
  });

  it("POST /api/payments — should reject invalid type", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/payments",
      headers: { authorization: `Bearer ${token}` },
      payload: { orderId: 1, type: "bribe", amount: "100.00" },
    });

    expect(res.statusCode).toBe(400);
  });
});
