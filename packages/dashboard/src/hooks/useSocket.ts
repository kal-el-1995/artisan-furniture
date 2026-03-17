// ─── Socket.io Hook ─────────────────────────────────────────
// Connects to the API server's Socket.io and listens for
// real-time events. When an event arrives, it:
// 1. Shows a toast notification
// 2. Invalidates relevant TanStack Query caches so data refreshes
//
// "Invalidate" means telling TanStack Query "this data might be
// stale, go fetch it again." This is how the Kanban board cards
// move automatically when a production task status changes.

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { addToast } from "../lib/toast";

export function useSocket() {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to the API server's Socket.io
    const socket = io("http://localhost:3000", {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket.io] Connected to server");
    });

    // Listen for notification events from the workers
    socket.on("notification", (data: { channel: string; message: string }) => {
      // Show a toast notification
      addToast(data.message);

      // Refresh relevant data based on the message content
      // This is a simple approach — match keywords in the message
      if (data.message.includes("order")) {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      }
      if (data.message.includes("production") || data.message.includes("task")) {
        queryClient.invalidateQueries({ queryKey: ["production"] });
      }
      if (data.message.includes("shipment")) {
        queryClient.invalidateQueries({ queryKey: ["shipments"] });
      }
      if (data.message.includes("agent") || data.message.includes("escalation")) {
        queryClient.invalidateQueries({ queryKey: ["agent-actions"] });
      }
    });

    // Listen for supervisor summary results
    socket.on("agent:summary", () => {
      addToast("Supervisor Agent generated a daily summary");
      queryClient.invalidateQueries({ queryKey: ["agent-actions"] });
    });

    socket.on("disconnect", () => {
      console.log("[Socket.io] Disconnected");
    });

    // Clean up when the component unmounts
    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  return socketRef;
}
