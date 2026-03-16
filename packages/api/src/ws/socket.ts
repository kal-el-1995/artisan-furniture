import { Server as HttpServer } from "node:http";
import { Server as SocketServer } from "socket.io";

// ── What is this file? ──────────────────────────────────────────────
// This sets up Socket.io — the real-time connection between our server
// and the browser dashboard.
//
// Normal HTTP works like a walkie-talkie: the browser asks, the server
// answers. Socket.io works like a phone call: once connected, either
// side can talk at any time. This lets us PUSH updates to the dashboard
// instantly (e.g. "a new order just came in!") without the browser
// having to refresh or poll.
//
// We export two things:
//   1. setupSocketServer(httpServer) — call this once when the server starts
//   2. getIO() — call this from anywhere to send events to the dashboard

let io: SocketServer | null = null;

/**
 * Attach Socket.io to the Fastify HTTP server.
 * Call this once, right after Fastify starts listening.
 */
export function setupSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    // CORS: allows the React dashboard (port 5173) to connect.
    // Without this, the browser would block the connection because
    // the dashboard and API run on different ports.
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  // This runs every time a browser connects
  io.on("connection", (socket) => {
    console.log(`  [Socket.io] Dashboard connected (${socket.id})`);

    socket.on("disconnect", () => {
      console.log(`  [Socket.io] Dashboard disconnected (${socket.id})`);
    });
  });

  console.log("  [Socket.io] Real-time server ready");
  return io;
}

/**
 * Get the Socket.io server instance.
 * Use this from workers to push events to the dashboard:
 *
 *   getIO()?.emit("order:created", { orderId: "123" })
 *
 * Returns null if Socket.io hasn't been set up yet (e.g. during tests).
 */
export function getIO(): SocketServer | null {
  return io;
}
