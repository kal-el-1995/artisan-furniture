// ─── Logistics Route Tests ──────────────────────────────────

import { describe, it, expect, beforeAll } from "vitest";
import { buildApp, getAuthToken } from "../test-helpers.js";

let app: Awaited<ReturnType<typeof buildApp>>;
let token: string;

beforeAll(async () => {
  app = await buildApp();
  token = await getAuthToken(app);
});

describe("Logistics Routes", () => {
  let createdShipmentId: number;

  it("GET /api/shipments — should list all shipments", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/shipments",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.length).toBeGreaterThanOrEqual(3);
  });

  it("POST /api/shipments — should create a shipment", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/shipments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        orderId: 4,
        type: "international",
        carrier: "Test Carrier",
        origin: "Mumbai, India",
        destination: "New York, NY",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("preparing");
    expect(body.carrier).toBe("Test Carrier");
    createdShipmentId = body.id;
  });

  it("POST /api/shipments — should reject invalid type", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/shipments",
      headers: { authorization: `Bearer ${token}` },
      payload: { orderId: 1, type: "teleportation" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("PATCH /api/shipments/:id/status — should update status", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/shipments/${createdShipmentId}/status`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "picked_up" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("picked_up");
  });
});
