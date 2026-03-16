// ─── MCP Resources ──────────────────────────────────────────
// Resources are read-only data that AI agents can access.
// They provide context for decision-making without side effects.
//
// Unlike tools (which DO things), resources just PROVIDE information.

import { db, orders, productionTasks, agentActions, payments } from "@artisan/db";
import { eq, ne, sql } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerResources(server: McpServer) {
  // ─── orders://active ──────────────────────────────────
  // All non-completed orders (everything still in progress)
  server.resource(
    "active-orders",
    "orders://active",
    { description: "All non-completed orders currently in the pipeline" },
    async () => {
      const activeOrders = await db
        .select()
        .from(orders)
        .where(ne(orders.status, "completed"));

      return {
        contents: [{
          uri: "orders://active",
          mimeType: "application/json",
          text: JSON.stringify(activeOrders, null, 2),
        }],
      };
    }
  );

  // ─── production://overview ────────────────────────────
  // Summary of the production pipeline — how many tasks in each status
  server.resource(
    "production-overview",
    "production://overview",
    { description: "Production pipeline summary with task counts by status" },
    async () => {
      const tasks = await db.select().from(productionTasks);

      const summary: Record<string, number> = {};
      for (const task of tasks) {
        summary[task.status] = (summary[task.status] || 0) + 1;
      }

      return {
        contents: [{
          uri: "production://overview",
          mimeType: "application/json",
          text: JSON.stringify({
            totalTasks: tasks.length,
            byStatus: summary,
          }, null, 2),
        }],
      };
    }
  );

  // ─── escalations://pending ────────────────────────────
  // Agent actions waiting for human approval
  server.resource(
    "pending-escalations",
    "escalations://pending",
    { description: "Agent actions awaiting human review and approval" },
    async () => {
      const pending = await db
        .select()
        .from(agentActions)
        .where(eq(agentActions.status, "pending"));

      const escalated = await db
        .select()
        .from(agentActions)
        .where(eq(agentActions.status, "escalated"));

      return {
        contents: [{
          uri: "escalations://pending",
          mimeType: "application/json",
          text: JSON.stringify({
            pendingCount: pending.length,
            escalatedCount: escalated.length,
            pending,
            escalated,
          }, null, 2),
        }],
      };
    }
  );

  // ─── metrics://snapshot ───────────────────────────────
  // Quick overview of the entire business — order counts, revenue, agent activity
  server.resource(
    "metrics-snapshot",
    "metrics://snapshot",
    { description: "Business metrics snapshot: order counts, revenue, agent activity" },
    async () => {
      // Order counts by status
      const allOrders = await db.select().from(orders);
      const ordersByStatus: Record<string, number> = {};
      for (const order of allOrders) {
        ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
      }

      // Total revenue (sum of all payments)
      const allPayments = await db.select().from(payments);
      const totalRevenue = allPayments
        .filter((p) => p.status === "processed")
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      // Agent activity
      const allActions = await db.select().from(agentActions);
      const agentActivity: Record<string, number> = {};
      for (const action of allActions) {
        agentActivity[action.status] = (agentActivity[action.status] || 0) + 1;
      }

      return {
        contents: [{
          uri: "metrics://snapshot",
          mimeType: "application/json",
          text: JSON.stringify({
            orders: {
              total: allOrders.length,
              byStatus: ordersByStatus,
            },
            revenue: {
              totalProcessed: totalRevenue.toFixed(2),
              currency: "USD",
            },
            agentActions: {
              total: allActions.length,
              byStatus: agentActivity,
            },
          }, null, 2),
        }],
      };
    }
  );
}
