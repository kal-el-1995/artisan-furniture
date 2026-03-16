// ─── Customer Routes ────────────────────────────────────────
//   GET /api/customers      — List all customers
//   GET /api/customers/:id  — Get one customer

import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import {
  listCustomers,
  getCustomerById,
} from "../services/customer.service.js";

const IdParam = Type.Object({ id: Type.Number() });

export async function customerRoutes(app: FastifyInstance) {
  app.get("/api/customers", { schema: { tags: ["Customers"] } }, async () => {
    return listCustomers();
  });

  app.get(
    "/api/customers/:id",
    { schema: { tags: ["Customers"], params: IdParam } },
    async (request, reply) => {
      const { id } = request.params as typeof IdParam.static;
      const customer = await getCustomerById(id);

      if (!customer) {
        return reply.code(404).send({ error: "Customer not found" });
      }

      return customer;
    }
  );
}
