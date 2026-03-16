// ─── Order Route Tests ──────────────────────────────────────
// End-to-end tests through HTTP (with auth + validation).

import { describe, it, expect, beforeAll } from "vitest";
import { buildApp, getAuthToken } from "../test-helpers.js";

let app: Awaited<ReturnType<typeof buildApp>>;
let token: string;

beforeAll(async () => {
  app = await buildApp();
  token = await getAuthToken(app);
});

describe("Order Routes", () => {
  let createdOrderId: number;

  it("POST /api/orders — should create a new order", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/orders",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerId: 1,
        orderType: "custom",
        totalAmount: "7777.00",
        showroomNotes: "Route test order",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.id).toBeTypeOf("number");
    expect(body.status).toBe("draft");
    expect(body.totalAmount).toBe("7777.00");
    createdOrderId = body.id;
  });

  it("POST /api/orders — should reject missing customerId", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/orders",
      headers: { authorization: `Bearer ${token}` },
      payload: { totalAmount: "100.00" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("GET /api/orders — should list all orders", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/orders",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(8); // at least seed data
  });

  it("GET /api/orders/:id — should return order with customer and items", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/orders/2",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(2);
    expect(body.customer).toBeDefined();
    expect(body.customer.name).toBe("Michael Torres");
    expect(body.items).toBeDefined();
    expect(body.items.length).toBeGreaterThanOrEqual(2);
  });

  it("GET /api/orders/99999 — should return 404", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/orders/99999",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it("PATCH /api/orders/:id/status — should update status", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/orders/${createdOrderId}/status`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "confirmed" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("confirmed");
  });

  it("PATCH /api/orders/:id/status — should reject invalid status", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/orders/${createdOrderId}/status`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "banana" },
    });

    expect(res.statusCode).toBe(400);
  });
});
