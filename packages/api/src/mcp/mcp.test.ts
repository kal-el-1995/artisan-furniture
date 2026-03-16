// ─── MCP Server Tests ───────────────────────────────────────
// Tests that the MCP server starts correctly and tools/resources work.
// We test by creating the McpServer, registering tools/resources,
// and calling them programmatically via an in-memory client.

import dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(import.meta.dirname, "../../../../.env") });

import { describe, it, expect, beforeAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";

let client: Client;

beforeAll(async () => {
  // Create MCP server
  const server = new McpServer({
    name: "artisan-furniture-test",
    version: "0.1.0",
  });

  registerTools(server);
  registerResources(server);

  // Create an in-memory transport (no stdio needed)
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  // Connect both sides
  const clientInstance = new Client({ name: "test-client", version: "1.0" });
  await server.connect(serverTransport);
  await clientInstance.connect(clientTransport);

  client = clientInstance;
});

describe("MCP Tools", () => {
  it("should list all registered tools", async () => {
    const result = await client.listTools();
    const toolNames = result.tools.map((t) => t.name);

    expect(toolNames).toContain("create_order");
    expect(toolNames).toContain("get_order");
    expect(toolNames).toContain("list_orders");
    expect(toolNames).toContain("update_order_status");
    expect(toolNames).toContain("confirm_order");
    expect(toolNames).toContain("list_customers");
    expect(toolNames).toContain("get_customer");
    expect(toolNames).toContain("get_production_dashboard");
    expect(toolNames).toContain("update_production_status");
    expect(toolNames).toContain("create_shipment");
    expect(toolNames).toContain("update_shipment_status");
    expect(toolNames).toContain("escalate_to_human");
    expect(toolNames).toContain("log_agent_action");
    expect(toolNames).toContain("get_pending_escalations");
  });

  it("should call get_customer tool", async () => {
    const result = await client.callTool({
      name: "get_customer",
      arguments: { id: 1 },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const customer = JSON.parse(text);
    expect(customer.name).toBe("Sarah Chen");
    expect(customer.email).toBe("sarah.chen@example.com");
  });

  it("should call list_orders tool", async () => {
    const result = await client.callTool({
      name: "list_orders",
      arguments: {},
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const orders = JSON.parse(text);
    expect(orders.length).toBeGreaterThanOrEqual(8);
  });

  it("should call create_order tool", async () => {
    const result = await client.callTool({
      name: "create_order",
      arguments: {
        customerId: 2,
        totalAmount: "3333.00",
        showroomNotes: "MCP test order",
      },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const order = JSON.parse(text);
    expect(order.status).toBe("draft");
    expect(order.totalAmount).toBe("3333.00");
  });

  it("should call get_production_dashboard tool", async () => {
    const result = await client.callTool({
      name: "get_production_dashboard",
      arguments: {},
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const dashboard = JSON.parse(text);
    expect(dashboard.summary).toBeDefined();
    expect(dashboard.tasks).toBeDefined();
    expect(dashboard.tasks.length).toBeGreaterThanOrEqual(8);
  });

  it("should call escalate_to_human tool", async () => {
    const result = await client.callTool({
      name: "escalate_to_human",
      arguments: {
        agentType: "order",
        actionType: "mcp_test_escalation",
        input: { orderId: 5 },
        output: { flagged: true },
        escalationReason: "MCP test — price exceeds threshold",
      },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const action = JSON.parse(text);
    expect(action.status).toBe("escalated");
    expect(action.escalationReason).toContain("MCP test");
  });
});

describe("MCP Resources", () => {
  it("should list all registered resources", async () => {
    const result = await client.listResources();
    const uris = result.resources.map((r) => r.uri);

    expect(uris).toContain("orders://active");
    expect(uris).toContain("production://overview");
    expect(uris).toContain("escalations://pending");
    expect(uris).toContain("metrics://snapshot");
  });

  it("should read orders://active resource", async () => {
    const result = await client.readResource({ uri: "orders://active" });
    const text = (result.contents[0] as { text: string }).text;
    const activeOrders = JSON.parse(text);

    expect(Array.isArray(activeOrders)).toBe(true);
    // No completed orders should be in active
    for (const order of activeOrders) {
      expect(order.status).not.toBe("completed");
    }
  });

  it("should read production://overview resource", async () => {
    const result = await client.readResource({ uri: "production://overview" });
    const text = (result.contents[0] as { text: string }).text;
    const overview = JSON.parse(text);

    expect(overview.totalTasks).toBeGreaterThanOrEqual(8);
    expect(overview.byStatus).toBeDefined();
  });

  it("should read escalations://pending resource", async () => {
    const result = await client.readResource({ uri: "escalations://pending" });
    const text = (result.contents[0] as { text: string }).text;
    const data = JSON.parse(text);

    expect(data.pendingCount).toBeTypeOf("number");
    expect(data.escalatedCount).toBeTypeOf("number");
  });

  it("should read metrics://snapshot resource", async () => {
    const result = await client.readResource({ uri: "metrics://snapshot" });
    const text = (result.contents[0] as { text: string }).text;
    const metrics = JSON.parse(text);

    expect(metrics.orders.total).toBeGreaterThanOrEqual(8);
    expect(metrics.orders.byStatus).toBeDefined();
    expect(metrics.revenue.totalProcessed).toBeDefined();
    expect(metrics.revenue.currency).toBe("USD");
    expect(metrics.agentActions.total).toBeGreaterThanOrEqual(4);
  });
});
