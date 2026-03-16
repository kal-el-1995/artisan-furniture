// ─── Agent Route Tests ──────────────────────────────────────

import { describe, it, expect, beforeAll } from "vitest";
import { buildApp, getAuthToken } from "../test-helpers.js";

let app: Awaited<ReturnType<typeof buildApp>>;
let token: string;

beforeAll(async () => {
  app = await buildApp();
  token = await getAuthToken(app);
});

describe("Agent Routes", () => {
  let createdActionId: number;

  it("GET /api/agent/actions — should list all actions", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/agent/actions",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.length).toBeGreaterThanOrEqual(4);
  });

  it("GET /api/agent/actions/pending — should list pending only", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/agent/actions/pending",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    for (const action of body) {
      expect(action.status).toBe("pending");
    }
  });

  it("POST /api/agent/actions — should log a new action", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/agent/actions",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        agentType: "order",
        actionType: "route_test_action",
        input: { test: true },
        output: { result: "ok" },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("pending");
    createdActionId = body.id;
  });

  it("PATCH /api/agent/actions/:id — should approve an action", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/agent/actions/${createdActionId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        status: "approved",
        humanResponse: "Approved by route test",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("approved");
    expect(body.humanResponse).toBe("Approved by route test");
  });

  it("PATCH /api/agent/actions/:id — should reject invalid status", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/agent/actions/${createdActionId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "maybe" },
    });

    expect(res.statusCode).toBe(400);
  });
});
