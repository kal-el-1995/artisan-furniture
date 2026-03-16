// ─── Logistics Routes ───────────────────────────────────────
//   GET   /api/shipments            — List all shipments
//   GET   /api/shipments/:id        — Get one shipment
//   POST  /api/shipments            — Create a shipment
//   PATCH /api/shipments/:id/status — Update shipment status

import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import {
  listShipments,
  getShipmentById,
  createShipment,
  updateShipmentStatus,
} from "../services/logistics.service.js";

const IdParam = Type.Object({ id: Type.Number() });

const CreateShipmentBody = Type.Object({
  orderId: Type.Number(),
  type: Type.Union([Type.Literal("international"), Type.Literal("domestic")]),
  carrier: Type.Optional(Type.String()),
  trackingNumber: Type.Optional(Type.String()),
  origin: Type.Optional(Type.String()),
  destination: Type.Optional(Type.String()),
});

const UpdateStatusBody = Type.Object({
  status: Type.Union([
    Type.Literal("preparing"),
    Type.Literal("picked_up"),
    Type.Literal("in_transit"),
    Type.Literal("customs_hold"),
    Type.Literal("customs_cleared"),
    Type.Literal("out_for_delivery"),
    Type.Literal("delivered"),
  ]),
});

export async function logisticsRoutes(app: FastifyInstance) {
  app.get("/api/shipments", { schema: { tags: ["Logistics"] } }, async () => {
    return listShipments();
  });

  app.get(
    "/api/shipments/:id",
    { schema: { tags: ["Logistics"], params: IdParam } },
    async (request, reply) => {
      const { id } = request.params as typeof IdParam.static;
      const shipment = await getShipmentById(id);

      if (!shipment) {
        return reply.code(404).send({ error: "Shipment not found" });
      }

      return shipment;
    }
  );

  app.post(
    "/api/shipments",
    { schema: { tags: ["Logistics"], body: CreateShipmentBody } },
    async (request, reply) => {
      const shipment = await createShipment(
        request.body as typeof CreateShipmentBody.static
      );
      return reply.code(201).send(shipment);
    }
  );

  app.patch(
    "/api/shipments/:id/status",
    { schema: { tags: ["Logistics"], params: IdParam, body: UpdateStatusBody } },
    async (request, reply) => {
      const { id } = request.params as typeof IdParam.static;
      const { status } = request.body as typeof UpdateStatusBody.static;

      const updated = await updateShipmentStatus({ id, status });

      if (!updated) {
        return reply.code(404).send({ error: "Shipment not found" });
      }

      return updated;
    }
  );
}
