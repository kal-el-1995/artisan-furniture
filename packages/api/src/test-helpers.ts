// ─── Test Helpers ───────────────────────────────────────────
// Shared setup for route-level tests.
// Builds the full Fastify app (with auth, validation, routes)
// but doesn't start it on a port — Supertest sends requests directly.

import dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(import.meta.dirname, "../../../.env") });

import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { setupAuth } from "./auth/auth.plugin.js";
import { authRoutes } from "./auth/auth.route.js";
import { orderRoutes } from "./routes/orders.js";
import { customerRoutes } from "./routes/customers.js";
import { productionRoutes } from "./routes/production.js";
import { logisticsRoutes } from "./routes/logistics.js";
import { paymentRoutes } from "./routes/payments.js";
import { agentRoutes } from "./routes/agent.js";

// Build the full Fastify app (same as server.ts but without listen())
export async function buildApp() {
  const app = Fastify({ logger: false }); // logger off for tests

  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? "test-secret",
  });

  setupAuth(app);
  app.register(authRoutes);

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.register(orderRoutes);
  app.register(customerRoutes);
  app.register(productionRoutes);
  app.register(logisticsRoutes);
  app.register(paymentRoutes);
  app.register(agentRoutes);

  await app.ready();
  return app;
}

// Login and get a JWT token for authenticated requests
export async function getAuthToken(app: Awaited<ReturnType<typeof buildApp>>) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: {
      username: process.env.ADMIN_USERNAME ?? "admin",
      password: process.env.ADMIN_PASSWORD ?? "admin123",
    },
  });
  const body = JSON.parse(response.body);
  return body.token as string;
}
