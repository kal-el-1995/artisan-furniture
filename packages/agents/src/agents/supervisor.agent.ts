/**
 * Supervisor Agent
 *
 * Generates daily summaries of business activity by:
 * 1. Fetching all orders and their statuses
 * 2. Checking the production pipeline
 * 3. Looking at pending escalations
 * 4. Reviewing agent activity
 * 5. Making recommendations
 *
 * This is a "skeleton" for the POC — it proves multi-agent
 * orchestration works. The real smarts come in production.
 */

import { db, orders, orderItems, productionTasks, artisans, agentActions } from "@artisan/db";
import { eq, desc } from "drizzle-orm";
import type { LLMProvider, Message, Tool, ToolCall } from "../providers/llm.js";
import { SUPERVISOR_AGENT_PROMPT } from "../prompts/supervisor.prompt.js";

// Safety limit — the supervisor should finish in fewer rounds
// since it only needs to call 3-4 tools and then write a report.
const MAX_ROUNDS = 8;

/**
 * The result of running the Supervisor Agent.
 */
export interface SupervisorAgentResult {
  summary: string;
  toolsUsed: string[];
}

/**
 * The tools the Supervisor Agent can use.
 * Fewer than the Order Agent — it only reads data and logs.
 */
const AGENT_TOOLS: Tool[] = [
  {
    type: "function",
    function: {
      name: "list_orders",
      description: "List all orders with their statuses, customer IDs, and amounts. Returns an array of orders sorted newest first.",
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
      description: "Get all production tasks grouped by status. Shows the current manufacturing pipeline and artisan assignments.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pending_escalations",
      description: "Get all agent actions with status 'escalated' that are waiting for human review.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_agent_action",
      description: "Log the daily summary for the audit trail. Always call this after generating a report.",
      parameters: {
        type: "object",
        properties: {
          agentType: { type: "string", description: "Always 'supervisor' for this agent" },
          actionType: { type: "string", description: "Always 'daily_summary'" },
          input: { type: "string", description: "JSON string — the date being summarized" },
          output: { type: "string", description: "JSON string — the full summary report" },
          status: { type: "string", description: "Always 'executed'" },
        },
        required: ["agentType", "actionType", "input", "output", "status"],
      },
    },
  },
];

/**
 * Execute a tool call by running the actual database query.
 */
async function executeTool(toolCall: ToolCall): Promise<string> {
  const { name, arguments: args } = toolCall.function;

  switch (name) {
    case "list_orders": {
      const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
      return JSON.stringify(allOrders);
    }

    case "get_production_dashboard": {
      const tasks = await db.select().from(productionTasks);
      const allArtisans = await db.select().from(artisans).where(eq(artisans.active, true));

      // Group tasks by status
      const byStatus: Record<string, number> = {};
      for (const task of tasks) {
        byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      }

      // Count tasks per artisan
      const byArtisan: Record<number, number> = {};
      for (const task of tasks) {
        if (task.artisanId) {
          byArtisan[task.artisanId] = (byArtisan[task.artisanId] || 0) + 1;
        }
      }

      return JSON.stringify({
        summary: byStatus,
        totalTasks: tasks.length,
        artisans: allArtisans.map((a) => ({
          id: a.id,
          name: a.name,
          specialty: a.specialty,
          activeTasks: byArtisan[a.id] || 0,
        })),
      });
    }

    case "get_pending_escalations": {
      const escalations = await db
        .select()
        .from(agentActions)
        .where(eq(agentActions.status, "escalated"));
      return JSON.stringify(escalations);
    }

    case "log_agent_action": {
      const { logAgentAction } = await import("./tool-helpers.js");

      // The local LLM sometimes passes plain strings instead of valid JSON.
      // Be defensive: try to parse, fall back to wrapping in an object.
      function safeParse(val: unknown): Record<string, unknown> {
        if (typeof val === "object" && val !== null) return val as Record<string, unknown>;
        if (typeof val === "string") {
          try { return JSON.parse(val); } catch { return { text: val }; }
        }
        return { value: val };
      }

      const action = await logAgentAction({
        agentType: String(args.agentType || "supervisor"),
        actionType: String(args.actionType || "daily_summary"),
        input: safeParse(args.input),
        output: safeParse(args.output),
        status: String(args.status || "executed") as "pending" | "approved" | "executed" | "rejected" | "escalated",
      });
      return JSON.stringify(action);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

/**
 * Run the Supervisor Agent to generate a daily summary.
 *
 * Same agent loop pattern as the Order Agent:
 * 1. Send the task + tools to the LLM
 * 2. If the LLM wants to call a tool → execute it → send result back
 * 3. Repeat until the LLM gives a final answer (the summary)
 */
export async function generateSummary(
  llm: LLMProvider,
): Promise<SupervisorAgentResult> {
  const toolsUsed: string[] = [];
  const today = new Date().toISOString().split("T")[0];

  // Start the conversation with the system prompt and the task
  const messages: Message[] = [
    { role: "system", content: SUPERVISOR_AGENT_PROMPT },
    {
      role: "user",
      content: `Generate a daily operations summary for ${today}. Use your tools to gather real data, then produce the structured report. Remember to log the summary when done.`,
    },
  ];

  // The agent loop
  for (let round = 0; round < MAX_ROUNDS; round++) {
    console.log(`  [Supervisor Agent] Round ${round + 1} — sending to LLM...`);

    const response = await llm.chat(messages, AGENT_TOOLS);

    // If the LLM doesn't want to call any tools, it's done
    if (!response.wants_tool_call) {
      console.log("  [Supervisor Agent] LLM finished — summary generated");

      return {
        summary: response.content,
        toolsUsed,
      };
    }

    // The LLM wants to call one or more tools
    messages.push({
      role: "assistant",
      content: response.content,
      tool_calls: response.tool_calls,
    });

    // Execute each tool call and add the results
    for (const toolCall of response.tool_calls) {
      const toolName = toolCall.function.name;
      console.log(`  [Supervisor Agent] Calling tool: ${toolName}`);
      toolsUsed.push(toolName);

      const result = await executeTool(toolCall);

      messages.push({
        role: "tool",
        content: result,
        tool_name: toolName,
      });
    }
  }

  // If we hit MAX_ROUNDS, return what we have
  console.warn(`  [Supervisor Agent] Hit max rounds (${MAX_ROUNDS}) — stopping`);
  return {
    summary: `Supervisor agent exceeded maximum rounds (${MAX_ROUNDS}). Partial data was collected but summary could not be completed.`,
    toolsUsed,
  };
}
