// ─── Auth Hook Setup ────────────────────────────────────────
// Adds an onRequest hook directly to the Fastify instance
// that checks for a valid JWT on every non-public route.
//
// This is NOT registered as a plugin (plugins get scoped).
// Instead, call setupAuth(app) directly in server.ts.

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

// Routes that don't require a token
const PUBLIC_ROUTES = [
  "/health",
  "/api/auth/login",
];

// Prefixes that don't require a token (Swagger docs)
const PUBLIC_PREFIXES = [
  "/docs",
];

function isPublicRoute(url: string): boolean {
  const path = url.split("?")[0];

  if (PUBLIC_ROUTES.includes(path)) return true;
  if (PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;

  return false;
}

export function setupAuth(app: FastifyInstance) {
  app.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (isPublicRoute(request.url)) return;

      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ error: "Unauthorized — valid token required" });
      }
    }
  );
}
