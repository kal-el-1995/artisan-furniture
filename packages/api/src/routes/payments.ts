// ─── Payment Routes ─────────────────────────────────────────
//   GET  /api/payments            — List all payments
//   GET  /api/payments/order/:id  — Get payments for a specific order
//   POST /api/payments            — Record a new payment

import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import {
  listPayments,
  getPaymentsByOrderId,
  createPayment,
} from "../services/payment.service.js";

const IdParam = Type.Object({ id: Type.Number() });

const CreatePaymentBody = Type.Object({
  orderId: Type.Number(),
  type: Type.Union([
    Type.Literal("deposit"),
    Type.Literal("progress"),
    Type.Literal("final"),
    Type.Literal("refund"),
  ]),
  amount: Type.String(),
  paymentMethod: Type.Optional(Type.String()),
});

export async function paymentRoutes(app: FastifyInstance) {
  app.get("/api/payments", { schema: { tags: ["Payments"] } }, async () => {
    return listPayments();
  });

  app.get(
    "/api/payments/order/:id",
    { schema: { tags: ["Payments"], params: IdParam } },
    async (request) => {
      const { id } = request.params as typeof IdParam.static;
      return getPaymentsByOrderId(id);
    }
  );

  app.post(
    "/api/payments",
    { schema: { tags: ["Payments"], body: CreatePaymentBody } },
    async (request, reply) => {
      const payment = await createPayment(
        request.body as typeof CreatePaymentBody.static
      );
      return reply.code(201).send(payment);
    }
  );
}
