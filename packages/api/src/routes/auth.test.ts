// ─── Auth Route Tests ───────────────────────────────────────
// Tests the login flow and JWT protection.

import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../test-helpers.js";

let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  app = await buildApp();
});

describe("Auth Routes", () => {
  describe("POST /api/auth/login", () => {
    it("should return a token with valid credentials", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { username: "admin", password: "admin123" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.token).toBeDefined();
      expect(typeof body.token).toBe("string");
      // JWT tokens have 3 parts separated by dots
      expect(body.token.split(".")).toHaveLength(3);
    });

    it("should reject invalid password", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { username: "admin", password: "wrong" },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("Invalid username or password");
    });

    it("should reject invalid username", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { username: "hacker", password: "admin123" },
      });

      expect(res.statusCode).toBe(401);
    });

    it("should reject missing fields", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {},
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("JWT Protection", () => {
    it("should allow access to /health without a token", async () => {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
    });

    it("should block protected routes without a token", async () => {
      const res = await app.inject({ method: "GET", url: "/api/orders" });
      expect(res.statusCode).toBe(401);
    });

    it("should block with an invalid token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/orders",
        headers: { authorization: "Bearer fake.invalid.token" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("should allow access with a valid token", async () => {
      // Login first
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { username: "admin", password: "admin123" },
      });
      const { token } = JSON.parse(loginRes.body);

      // Use the token
      const res = await app.inject({
        method: "GET",
        url: "/api/orders",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });
});
