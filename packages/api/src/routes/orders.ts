// ─── Orders Routes ──────────────────────────────────────────
// All order-related API endpoints.
// Each route validates input with Typebox, then calls the service layer.
//
// Endpoints:
//   POST   /api/orders          — Create a new order
//   GET    /api/orders          — List all orders
//   GET    /api/orders/:id      — Get one order (with customer + items)
//   PATCH  /api/orders/:id/status — Update an order's status

import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import {
  createOrder,
  listOrders,
  getOrderById,
  updateOrderStatus,
} from "../services/order.service.js";

// ─── Typebox Schemas ────────────────────────────────────────
// These define what shape the request data must have.
// Fastify automatically rejects requests that don't match.

// Schema for creating a new order (the request body)
const CreateOrderBody = Type.Object({
  customerId: Type.Number(),
  orderType: Type.Optional(Type.String()),
  totalAmount: Type.Optional(Type.String()),
  depositAmount: Type.Optional(Type.String()),
  showroomNotes: Type.Optional(Type.String()),
});

// Schema for the :id parameter in the URL (e.g. /api/orders/5)
const IdParam = Type.Object({
  id: Type.Number(),
});

// Schema for updating an order's status (the request body)
const UpdateStatusBody = Type.Object({
  status: Type.Union([
    Type.Literal("draft"),
    Type.Literal("confirmed"),
    Type.Literal("in_production"),
    Type.Literal("quality_check"),
    Type.Literal("ready_to_ship"),
    Type.Literal("in_transit"),
    Type.Literal("customs"),
    Type.Literal("delivered"),
    Type.Literal("completed"),
  ]),
});

// ─── Route Registration ────────────────────────────────────
// This function registers all order routes on the Fastify app.
// We export it and call it from server.ts.

export async function orderRoutes(app: FastifyInstance) {
  // POST /api/orders — Create a new order
  app.post(
    "/api/orders",
    { schema: { tags: ["Orders"], body: CreateOrderBody } },
    async (request, reply) => {
      const order = await createOrder(request.body as typeof CreateOrderBody.static);
      return reply.code(201).send(order);
    }
  );

  // GET /api/orders — List all orders
  app.get("/api/orders", { schema: { tags: ["Orders"] } }, async () => {
    const orders = await listOrders();
    return orders;
  });

  // GET /api/orders/:id — Get one order with customer + items
  app.get(
    "/api/orders/:id",
    { schema: { tags: ["Orders"], params: IdParam } },
    async (request, reply) => {
      const { id } = request.params as typeof IdParam.static;
      const order = await getOrderById(id);

      if (!order) {
        return reply.code(404).send({ error: "Order not found" });
      }

      return order;
    }
  );

  // PATCH /api/orders/:id/status — Update an order's status
  app.patch(
    "/api/orders/:id/status",
    { schema: { tags: ["Orders"], params: IdParam, body: UpdateStatusBody } },
    async (request, reply) => {
      const { id } = request.params as typeof IdParam.static;
      const { status } = request.body as typeof UpdateStatusBody.static;

      const updated = await updateOrderStatus({ id, status });

      if (!updated) {
        return reply.code(404).send({ error: "Order not found" });
      }

      return updated;
    }
  );
}
