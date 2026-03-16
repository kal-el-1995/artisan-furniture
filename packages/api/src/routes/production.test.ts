// ─── Production Route Tests ─────────────────────────────────

import { describe, it, expect, beforeAll } from "vitest";
import { buildApp, getAuthToken } from "../test-helpers.js";

let app: Awaited<ReturnType<typeof buildApp>>;
let token: string;

beforeAll(async () => {
  app = await buildApp();
  token = await getAuthToken(app);
});

describe("Production Routes", () => {
  it("GET /api/production — should list all tasks", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/production",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.length).toBeGreaterThanOrEqual(8);
  });

  it("GET /api/production/:id — should return task with artisan and item", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/production/1",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(1);
    expect(body.artisan).toBeDefined();
    expect(body.orderItem).toBeDefined();
  });

  it("GET /api/production/99999 — should return 404", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/production/99999",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it("PATCH /api/production/:id/status — should reject invalid status", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/production/1/status",
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "flying" },
    });

    expect(res.statusCode).toBe(400);
  });
});
