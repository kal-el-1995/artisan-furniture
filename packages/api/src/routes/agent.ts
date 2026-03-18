// ─── Agent Routes ───────────────────────────────────────────
//   GET   /api/agent/actions          — List all agent actions
//   GET   /api/agent/actions/pending  — Get pending actions (awaiting approval)
//   POST  /api/agent/actions          — Log a new agent action
//   PATCH /api/agent/actions/:id      — Approve or reject an action

import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import {
  listAgentActions,
  getPendingActions,
  logAgentAction,
  reviewAgentAction,
} from "../services/agent.service.js";
import { queueAgentTask } from "../queue/queues.js";

const IdParam = Type.Object({ id: Type.Number() });

const LogActionBody = Type.Object({
  agentType: Type.String(),
  actionType: Type.String(),
  input: Type.Unknown(),
  output: Type.Unknown(),
  status: Type.Optional(
    Type.Union([
      Type.Literal("pending"),
      Type.Literal("approved"),
      Type.Literal("executed"),
      Type.Literal("rejected"),
      Type.Literal("escalated"),
    ])
  ),
  escalationReason: Type.Optional(Type.String()),
});

const ReviewActionBody = Type.Object({
  status: Type.Union([Type.Literal("approved"), Type.Literal("rejected")]),
  humanResponse: Type.Optional(Type.String()),
});

export async function agentRoutes(app: FastifyInstance) {
  app.get("/api/agent/actions", { schema: { tags: ["Agent"] } }, async () => {
    return listAgentActions();
  });

  app.get("/api/agent/actions/pending", { schema: { tags: ["Agent"] } }, async () => {
    return getPendingActions();
  });

  app.post(
    "/api/agent/actions",
    { schema: { tags: ["Agent"], body: LogActionBody } },
    async (request, reply) => {
      const action = await logAgentAction(
        request.body as typeof LogActionBody.static
      );
      return reply.code(201).send(action);
    }
  );

  // ── Generate Daily Summary ─────────────────────────────────
  // Queues a job for the Supervisor Agent to generate a daily
  // operations summary. The agent worker picks this up and runs
  // the LLM. Results come back via Socket.io + notification.
  app.post(
    "/api/agent/summary",
    { schema: { tags: ["Agent"], body: Type.Object({}) } },
    async (_request, reply) => {
      await queueAgentTask("generate-summary", {});
      return reply.code(202).send({ message: "Summary generation queued" });
    }
  );

  app.patch(
    "/api/agent/actions/:id",
    { schema: { tags: ["Agent"], params: IdParam, body: ReviewActionBody } },
    async (request, reply) => {
      const { id } = request.params as typeof IdParam.static;
      const body = request.body as typeof ReviewActionBody.static;

      const updated = await reviewAgentAction({ id, ...body });

      if (!updated) {
        return reply.code(404).send({ error: "Agent action not found" });
      }

      return updated;
    }
  );
}
