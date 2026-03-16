// ─── MCP Tools ──────────────────────────────────────────────
// Tools are actions that AI agents can perform.
// Each tool calls the same service layer that REST routes use.
// This means humans (via REST) and AI agents (via MCP) share
// the exact same business logic. One source of truth.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Import all our service functions
import {
  createOrder,
  listOrders,
  getOrderById,
  updateOrderStatus,
} from "../services/order.service.js";

import {
  listCustomers,
  getCustomerById,
} from "../services/customer.service.js";

import {
  listProductionTasks,
  getProductionTaskById,
  updateProductionStatus,
} from "../services/production.service.js";

import {
  createShipment,
  updateShipmentStatus,
} from "../services/logistics.service.js";

import {
  logAgentAction,
  getPendingActions,
} from "../services/agent.service.js";

export function registerTools(server: McpServer) {
  // ─── ORDER TOOLS ────────────────────────────────────────

  server.tool(
    "create_order",
    "Create a new furniture order for a customer. Starts in 'draft' status.",
    {
      customerId: z.number().describe("ID of the customer placing the order"),
      orderType: z.string().optional().describe("'custom' or 'catalog'"),
      totalAmount: z.string().optional().describe("Total price, e.g. '5500.00'"),
      depositAmount: z.string().optional().describe("Deposit required, e.g. '1650.00'"),
      showroomNotes: z.string().optional().describe("Notes from the showroom consultation"),
    },
    async (params) => {
      const order = await createOrder(params);
      return { content: [{ type: "text", text: JSON.stringify(order, null, 2) }] };
    }
  );

  server.tool(
    "get_order",
    "Get a single order by ID, including its customer info and all order items.",
    {
      id: z.number().describe("The order ID"),
    },
    async ({ id }) => {
      const order = await getOrderById(id);
      if (!order) {
        return { content: [{ type: "text", text: "Order not found" }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(order, null, 2) }] };
    }
  );

  server.tool(
    "list_orders",
    "List all orders, sorted newest first.",
    {},
    async () => {
      const orders = await listOrders();
      return { content: [{ type: "text", text: JSON.stringify(orders, null, 2) }] };
    }
  );

  server.tool(
    "update_order_status",
    "Update an order's status (e.g. draft → confirmed → in_production).",
    {
      id: z.number().describe("The order ID"),
      status: z.enum([
        "draft", "confirmed", "in_production", "quality_check",
        "ready_to_ship", "in_transit", "customs", "delivered", "completed",
      ]).describe("The new status"),
    },
    async (params) => {
      const updated = await updateOrderStatus(params);
      if (!updated) {
        return { content: [{ type: "text", text: "Order not found" }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(updated, null, 2) }] };
    }
  );

  server.tool(
    "confirm_order",
    "Confirm a draft order (shortcut for update_order_status with 'confirmed').",
    {
      id: z.number().describe("The order ID to confirm"),
    },
    async ({ id }) => {
      const updated = await updateOrderStatus({ id, status: "confirmed" });
      if (!updated) {
        return { content: [{ type: "text", text: "Order not found" }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(updated, null, 2) }] };
    }
  );

  // ─── CUSTOMER TOOLS ─────────────────────────────────────

  server.tool(
    "list_customers",
    "List all customers.",
    {},
    async () => {
      const customers = await listCustomers();
      return { content: [{ type: "text", text: JSON.stringify(customers, null, 2) }] };
    }
  );

  server.tool(
    "get_customer",
    "Get a customer by their ID.",
    {
      id: z.number().describe("The customer ID"),
    },
    async ({ id }) => {
      const customer = await getCustomerById(id);
      if (!customer) {
        return { content: [{ type: "text", text: "Customer not found" }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(customer, null, 2) }] };
    }
  );

  // ─── PRODUCTION TOOLS ───────────────────────────────────

  server.tool(
    "get_production_dashboard",
    "Get all production tasks with their current status. Useful for understanding the manufacturing pipeline.",
    {},
    async () => {
      const tasks = await listProductionTasks();
      // Group by status for a dashboard view
      const grouped: Record<string, number> = {};
      for (const task of tasks) {
        grouped[task.status] = (grouped[task.status] || 0) + 1;
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ summary: grouped, tasks }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "update_production_status",
    "Update a production task's status (e.g. assigned → in_progress → quality_check → approved).",
    {
      id: z.number().describe("The production task ID"),
      status: z.enum([
        "pending", "assigned", "in_progress",
        "quality_check", "approved", "rejected", "rework",
      ]).describe("The new status"),
      qualityCheckStatus: z.string().optional().describe("Quality check result"),
      qualityNotes: z.string().optional().describe("Notes about quality"),
    },
    async (params) => {
      const updated = await updateProductionStatus(params);
      if (!updated) {
        return { content: [{ type: "text", text: "Production task not found" }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(updated, null, 2) }] };
    }
  );

  // ─── LOGISTICS TOOLS ────────────────────────────────────

  server.tool(
    "create_shipment",
    "Create a new shipment for an order.",
    {
      orderId: z.number().describe("The order ID to ship"),
      type: z.enum(["international", "domestic"]).describe("Shipment type"),
      carrier: z.string().optional().describe("Shipping carrier name"),
      trackingNumber: z.string().optional().describe("Tracking number"),
      origin: z.string().optional().describe("Origin location, e.g. 'Mumbai, India'"),
      destination: z.string().optional().describe("Destination, e.g. 'New York, NY'"),
    },
    async (params) => {
      const shipment = await createShipment(params);
      return { content: [{ type: "text", text: JSON.stringify(shipment, null, 2) }] };
    }
  );

  server.tool(
    "update_shipment_status",
    "Update a shipment's tracking status.",
    {
      id: z.number().describe("The shipment ID"),
      status: z.enum([
        "preparing", "picked_up", "in_transit",
        "customs_hold", "customs_cleared", "out_for_delivery", "delivered",
      ]).describe("The new status"),
    },
    async (params) => {
      const updated = await updateShipmentStatus(params);
      if (!updated) {
        return { content: [{ type: "text", text: "Shipment not found" }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(updated, null, 2) }] };
    }
  );

  // ─── AGENT TOOLS ────────────────────────────────────────

  server.tool(
    "escalate_to_human",
    "Escalate a decision to a human for review. Use this when confidence is low or the action exceeds agent authority.",
    {
      agentType: z.string().describe("Which agent is escalating (e.g. 'order', 'production')"),
      actionType: z.string().describe("What action needs human review"),
      input: z.any().describe("The data the agent was working with"),
      output: z.any().describe("The agent's proposed action/decision"),
      escalationReason: z.string().describe("Why this needs human review"),
    },
    async (params) => {
      const action = await logAgentAction({
        ...params,
        status: "escalated",
      });
      return { content: [{ type: "text", text: JSON.stringify(action, null, 2) }] };
    }
  );

  server.tool(
    "log_agent_action",
    "Log an action taken by an AI agent. Use this for transparency and audit trails.",
    {
      agentType: z.string().describe("Which agent performed the action"),
      actionType: z.string().describe("What action was taken"),
      input: z.any().describe("What the agent received"),
      output: z.any().describe("What the agent decided/produced"),
      status: z.enum(["pending", "approved", "executed", "rejected", "escalated"])
        .optional()
        .describe("Action status (defaults to 'pending')"),
    },
    async (params) => {
      const action = await logAgentAction(params);
      return { content: [{ type: "text", text: JSON.stringify(action, null, 2) }] };
    }
  );

  server.tool(
    "get_pending_escalations",
    "Get all agent actions that are waiting for human approval.",
    {},
    async () => {
      const pending = await getPendingActions();
      return { content: [{ type: "text", text: JSON.stringify(pending, null, 2) }] };
    }
  );
}
