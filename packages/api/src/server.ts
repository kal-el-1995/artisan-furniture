// ─── Artisan Furniture API Server ───────────────────────────
// This is the entry point for the Fastify API.
// It creates the server, registers plugins and route modules, and starts listening.

import dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(import.meta.dirname, "../../../.env") });

import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { setupAuth } from "./auth/auth.plugin.js";
import { authRoutes } from "./auth/auth.route.js";
import { orderRoutes } from "./routes/orders.js";
import { customerRoutes } from "./routes/customers.js";
import { productionRoutes } from "./routes/production.js";
import { logisticsRoutes } from "./routes/logistics.js";
import { paymentRoutes } from "./routes/payments.js";
import { agentRoutes } from "./routes/agent.js";
import { setupSocketServer } from "./ws/socket.js";
import "./queue/workers.js"; // Start all queue workers when the server boots
import { closeWorkers } from "./queue/workers.js";

// Create the Fastify instance
// logger: true means it prints helpful info to the console
// (what requests come in, any errors, etc.)
const app = Fastify({ logger: true });

// ─── JWT Authentication ─────────────────────────────────────
// Register the JWT plugin with our secret from .env
// This adds app.jwt.sign() and request.jwtVerify() methods
app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET ?? "fallback-secret-for-dev",
});

// ─── Swagger (API documentation) ───────────────────────────
// This auto-generates interactive docs from our route schemas.
// Visit http://localhost:3000/docs to see them.
app.register(swagger, {
  openapi: {
    info: {
      title: "Artisan Furniture API",
      description: "API for managing handcrafted furniture orders, production, shipping, and AI agent actions.",
      version: "0.1.0",
    },
    tags: [
      { name: "Auth", description: "Login and authentication" },
      { name: "Orders", description: "Customer order management" },
      { name: "Customers", description: "Customer information" },
      { name: "Production", description: "Manufacturing task tracking" },
      { name: "Logistics", description: "Shipment and delivery management" },
      { name: "Payments", description: "Payment record keeping" },
      { name: "Agent", description: "AI agent actions and human approvals" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
});

app.register(swaggerUi, {
  routePrefix: "/docs",
});

// ─── Health check route ─────────────────────────────────────
// A simple "is the server alive?" endpoint. (Public — no auth needed)
app.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// ─── Auth ───────────────────────────────────────────────────
// setupAuth adds a hook that checks every request for a valid JWT.
// Public routes (health, docs, login) are skipped.
// This must be called directly (not registered as a plugin) so
// the hook applies globally to all routes, not just a scoped context.
setupAuth(app);
app.register(authRoutes);

// ─── Register route modules ────────────────────────────────
// Each domain (orders, customers, etc.) has its own route file.
// All of these are protected by the auth plugin above.
app.register(orderRoutes);
app.register(customerRoutes);
app.register(productionRoutes);
app.register(logisticsRoutes);
app.register(paymentRoutes);
app.register(agentRoutes);

// ─── Start the server ───────────────────────────────────────
async function start() {
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });

    // Attach Socket.io to the underlying HTTP server.
    // We do this AFTER listen() because that's when Fastify creates
    // the raw Node.js HTTP server that Socket.io needs.
    setupSocketServer(app.server);

    console.log("\n  Artisan Furniture API is running!");
    console.log("  http://localhost:3000/docs    ← API documentation");
    console.log("  http://localhost:3000/health   ← Health check");
    console.log("  POST http://localhost:3000/api/auth/login ← Get a token");
    console.log("  [Socket.io] ws://localhost:3000  ← Real-time updates\n");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

// ─── Graceful shutdown ─────────────────────────────────────
// When the server is stopped (e.g. Ctrl+C), close workers cleanly
// so they finish any in-progress jobs before shutting down.
process.on("SIGINT", async () => {
  console.log("\n  Shutting down...");
  await closeWorkers();
  await app.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeWorkers();
  await app.close();
  process.exit(0);
});
