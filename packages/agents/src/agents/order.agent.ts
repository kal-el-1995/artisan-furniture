/**
 * Order Agent
 *
 * Processes new furniture orders by:
 * 1. Fetching the order details
 * 2. Validating completeness
 * 3. Suggesting artisan assignments based on specialties
 * 4. Estimating production timeline
 * 5. Auto-confirming or escalating to a human
 *
 * Uses the LLM provider to make decisions, and calls service
 * functions to read/write real data.
 */

import { db, orders, orderItems, customers, artisans, productionTasks } from "@artisan/db";
import { eq, desc } from "drizzle-orm";
import type { LLMProvider, Message, Tool, ToolCall } from "../providers/llm.js";
import { ORDER_AGENT_PROMPT } from "../prompts/order.prompt.js";

// Maximum number of tool-call rounds before we stop the loop.
// This prevents the agent from running forever if something goes wrong.
const MAX_ROUNDS = 10;

/**
 * The result of processing an order.
 */
export interface OrderAgentResult {
  orderId: number;
  decision: "confirmed" | "escalated" | "error";
  reasoning: string;
  toolsUsed: string[];
}

/**
 * The tools the Order Agent can use.
 * These map to real database queries and service functions.
 */
const AGENT_TOOLS: Tool[] = [
  {
    type: "function",
    function: {
      name: "get_order",
      description: "Get a single order by ID, including customer info and all order items.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "The order ID" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_orders",
      description: "List all orders, sorted newest first.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_customer",
      description: "Get a customer by their ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "The customer ID" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_customers",
      description: "List all customers.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_production_dashboard",
      description: "Get all production tasks grouped by status. Shows the current manufacturing pipeline.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_artisans",
      description: "List all active artisans with their specialties, location, capacity, and quality rating.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "confirm_order",
      description: "Confirm a draft order. Moves it to 'confirmed' status which triggers production task creation.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "The order ID to confirm" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_agent_action",
      description: "Log an action for transparency. Always call this after processing an order.",
      parameters: {
        type: "object",
        properties: {
          agentType: { type: "string", description: "Always 'order' for this agent" },
          actionType: { type: "string", description: "What action was taken (e.g. 'process_order')" },
          input: { type: "string", description: "JSON string of what the agent received" },
          output: { type: "string", description: "JSON string of the agent's decision and reasoning" },
          status: { type: "string", description: "'executed' if auto-confirmed, 'escalated' if sent to human" },
        },
        required: ["agentType", "actionType", "input", "output", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate_to_human",
      description: "Escalate a decision to a human for review. Use when confidence is low or the order needs special attention.",
      parameters: {
        type: "object",
        properties: {
          agentType: { type: "string", description: "Always 'order' for this agent" },
          actionType: { type: "string", description: "What action needs human review" },
          input: { type: "string", description: "JSON string of the order data" },
          output: { type: "string", description: "JSON string of the agent's proposed action" },
          escalationReason: { type: "string", description: "Why this needs human review" },
        },
        required: ["agentType", "actionType", "input", "output", "escalationReason"],
      },
    },
  },
];

/**
 * Execute a tool call from the LLM by running the actual database query.
 * This is the bridge between what the AI "wants to do" and what actually happens.
 */
async function executeTool(toolCall: ToolCall): Promise<string> {
  const { name, arguments: args } = toolCall.function;

  switch (name) {
    case "get_order": {
      const id = Number(args.id);
      const [order] = await db.select().from(orders).where(eq(orders.id, id));
      if (!order) return JSON.stringify({ error: "Order not found" });

      const [customer] = await db.select().from(customers).where(eq(customers.id, order.customerId));
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
      return JSON.stringify({ ...order, customer, items });
    }

    case "list_orders": {
      const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
      return JSON.stringify(allOrders);
    }

    case "get_customer": {
      const id = Number(args.id);
      const [customer] = await db.select().from(customers).where(eq(customers.id, id));
      return customer ? JSON.stringify(customer) : JSON.stringify({ error: "Customer not found" });
    }

    case "list_customers": {
      const allCustomers = await db.select().from(customers);
      return JSON.stringify(allCustomers);
    }

    case "get_production_dashboard": {
      const tasks = await db.select().from(productionTasks);
      const grouped: Record<string, number> = {};
      for (const task of tasks) {
        grouped[task.status] = (grouped[task.status] || 0) + 1;
      }
      return JSON.stringify({ summary: grouped, tasks });
    }

    case "list_artisans": {
      const allArtisans = await db.select().from(artisans).where(eq(artisans.active, true));
      return JSON.stringify(allArtisans);
    }

    case "confirm_order": {
      const id = Number(args.id);
      const [updated] = await db
        .update(orders)
        .set({ status: "confirmed", updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();
      if (!updated) return JSON.stringify({ error: "Order not found" });
      // Note: we don't emit the business event here — the agent worker
      // in workers.ts will handle the downstream effects after the agent finishes
      return JSON.stringify({ success: true, order: updated });
    }

    case "log_agent_action": {
      // Import dynamically to avoid circular dependency
      const { logAgentAction } = await import("./tool-helpers.js");
      const action = await logAgentAction({
        agentType: String(args.agentType),
        actionType: String(args.actionType),
        input: typeof args.input === "string" ? JSON.parse(args.input) : args.input,
        output: typeof args.output === "string" ? JSON.parse(args.output) : args.output,
        status: String(args.status) as "pending" | "approved" | "executed" | "rejected" | "escalated",
      });
      return JSON.stringify(action);
    }

    case "escalate_to_human": {
      const { logAgentAction } = await import("./tool-helpers.js");
      const action = await logAgentAction({
        agentType: String(args.agentType),
        actionType: String(args.actionType),
        input: typeof args.input === "string" ? JSON.parse(args.input) : args.input,
        output: typeof args.output === "string" ? JSON.parse(args.output) : args.output,
        status: "escalated",
        escalationReason: String(args.escalationReason),
      });
      return JSON.stringify(action);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

/**
 * Process a single order using the Order Agent.
 *
 * This is the main "agent loop":
 * 1. Send the task + tools to the LLM
 * 2. If the LLM wants to call a tool → execute it → send result back
 * 3. Repeat until the LLM gives a final answer (no more tool calls)
 */
export async function processOrder(
  llm: LLMProvider,
  orderId: number,
): Promise<OrderAgentResult> {
  const toolsUsed: string[] = [];

  // Start the conversation with the system prompt and the task
  const messages: Message[] = [
    { role: "system", content: ORDER_AGENT_PROMPT },
    {
      role: "user",
      content: `Process order #${orderId}. Follow your workflow: gather info, validate, suggest artisan, estimate timeline, then confirm or escalate. Use the tools available to you.`,
    },
  ];

  // The agent loop — keep going until the LLM is done or we hit the limit
  for (let round = 0; round < MAX_ROUNDS; round++) {
    console.log(`  [Order Agent] Round ${round + 1} — sending to LLM...`);

    const response = await llm.chat(messages, AGENT_TOOLS);

    // If the LLM doesn't want to call any tools, it's done
    if (!response.wants_tool_call) {
      console.log("  [Order Agent] LLM finished — no more tool calls");

      // Determine the decision from the conversation history
      const decision = determineDecision(toolsUsed, response.content);

      return {
        orderId,
        decision,
        reasoning: response.content,
        toolsUsed,
      };
    }

    // The LLM wants to call one or more tools
    // Add the assistant's response (with tool_calls) to the conversation
    messages.push({
      role: "assistant",
      content: response.content,
      tool_calls: response.tool_calls,
    });

    // Execute each tool call and add the results to the conversation
    for (const toolCall of response.tool_calls) {
      const toolName = toolCall.function.name;
      console.log(`  [Order Agent] Calling tool: ${toolName}`);
      toolsUsed.push(toolName);

      const result = await executeTool(toolCall);

      // Send the tool result back to the LLM
      messages.push({
        role: "tool",
        content: result,
        tool_name: toolName,
      });
    }
  }

  // If we hit MAX_ROUNDS, something went wrong
  console.warn(`  [Order Agent] Hit max rounds (${MAX_ROUNDS}) — stopping`);
  return {
    orderId,
    decision: "error",
    reasoning: `Agent exceeded maximum rounds (${MAX_ROUNDS}). This usually means the LLM is stuck in a loop.`,
    toolsUsed,
  };
}

/**
 * Figure out whether the agent confirmed or escalated based on
 * which tools it called. Simple heuristic — if it called
 * "escalate_to_human", it escalated. If it called "confirm_order",
 * it confirmed. Otherwise, treat as error.
 */
function determineDecision(
  toolsUsed: string[],
  finalResponse: string,
): "confirmed" | "escalated" | "error" {
  if (toolsUsed.includes("escalate_to_human")) return "escalated";
  if (toolsUsed.includes("confirm_order")) return "confirmed";

  // Check the text response as a fallback
  const lower = finalResponse.toLowerCase();
  if (lower.includes("escalat")) return "escalated";
  if (lower.includes("confirm")) return "confirmed";

  return "error";
}
