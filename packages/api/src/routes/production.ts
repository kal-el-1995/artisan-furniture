// ─── Production Routes ──────────────────────────────────────
//   GET   /api/production          — List all production tasks
//   GET   /api/production/:id      — Get one task (with order item + artisan)
//   PATCH /api/production/:id/status — Update task status

import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import {
  listProductionTasks,
  getProductionTaskById,
  updateProductionStatus,
} from "../services/production.service.js";

const IdParam = Type.Object({ id: Type.Number() });

const UpdateStatusBody = Type.Object({
  status: Type.Union([
    Type.Literal("pending"),
    Type.Literal("assigned"),
    Type.Literal("in_progress"),
    Type.Literal("quality_check"),
    Type.Literal("approved"),
    Type.Literal("rejected"),
    Type.Literal("rework"),
  ]),
  qualityCheckStatus: Type.Optional(Type.String()),
  qualityNotes: Type.Optional(Type.String()),
});

export async function productionRoutes(app: FastifyInstance) {
  app.get("/api/production", { schema: { tags: ["Production"] } }, async () => {
    return listProductionTasks();
  });

  app.get(
    "/api/production/:id",
    { schema: { tags: ["Production"], params: IdParam } },
    async (request, reply) => {
      const { id } = request.params as typeof IdParam.static;
      const task = await getProductionTaskById(id);

      if (!task) {
        return reply.code(404).send({ error: "Production task not found" });
      }

      return task;
    }
  );

  app.patch(
    "/api/production/:id/status",
    { schema: { tags: ["Production"], params: IdParam, body: UpdateStatusBody } },
    async (request, reply) => {
      const { id } = request.params as typeof IdParam.static;
      const body = request.body as typeof UpdateStatusBody.static;

      const updated = await updateProductionStatus({ id, ...body });

      if (!updated) {
        return reply.code(404).send({ error: "Production task not found" });
      }

      return updated;
    }
  );
}
