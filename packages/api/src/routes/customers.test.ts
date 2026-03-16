// ─── Customer Route Tests ───────────────────────────────────

import { describe, it, expect, beforeAll } from "vitest";
import { buildApp, getAuthToken } from "../test-helpers.js";

let app: Awaited<ReturnType<typeof buildApp>>;
let token: string;

beforeAll(async () => {
  app = await buildApp();
  token = await getAuthToken(app);
});

describe("Customer Routes", () => {
  it("GET /api/customers — should list all customers", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/customers",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.length).toBeGreaterThanOrEqual(3);
    expect(body[0].name).toBeDefined();
    expect(body[0].email).toBeDefined();
  });

  it("GET /api/customers/:id — should return a customer", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/customers/1",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.name).toBe("Sarah Chen");
  });

  it("GET /api/customers/99999 — should return 404", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/customers/99999",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
  });
});
