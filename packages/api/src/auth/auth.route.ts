// ─── Auth Route ─────────────────────────────────────────────
// Login endpoint. Send username + password, get a JWT token back.
//
//   POST /api/auth/login
//     Body: { "username": "admin", "password": "admin123" }
//     Returns: { "token": "eyJhbG..." }

import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";

const LoginBody = Type.Object({
  username: Type.String(),
  password: Type.String(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/api/auth/login",
    { schema: { tags: ["Auth"], body: LoginBody } },
    async (request, reply) => {
      const { username, password } = request.body as typeof LoginBody.static;

      // Check against the hardcoded admin credentials from .env
      const validUser = process.env.ADMIN_USERNAME ?? "admin";
      const validPass = process.env.ADMIN_PASSWORD ?? "admin123";

      if (username !== validUser || password !== validPass) {
        return reply.code(401).send({ error: "Invalid username or password" });
      }

      // Credentials are correct — generate a JWT token
      // The token contains the username and role (payload)
      // It expires in 24 hours
      const token = app.jwt.sign(
        { username, role: "admin" },
        { expiresIn: "24h" }
      );

      return { token };
    }
  );
}
