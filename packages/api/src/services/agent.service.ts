// ─── Agent Service ──────────────────────────────────────────
// AI agent action management.
// Tracks what agents do, handles the human approval workflow.

import { db, agentActions } from "@artisan/db";
import { eq, desc } from "drizzle-orm";

// Get all agent actions, newest first
export async function listAgentActions() {
  return db.select().from(agentActions).orderBy(desc(agentActions.createdAt));
}

// Get pending actions (waiting for human approval)
export async function getPendingActions() {
  return db
    .select()
    .from(agentActions)
    .where(eq(agentActions.status, "pending"))
    .orderBy(desc(agentActions.createdAt));
}

// Log a new agent action
type LogAgentActionInput = {
  agentType: string;
  actionType: string;
  input: unknown;
  output: unknown;
  status?: "pending" | "approved" | "executed" | "rejected" | "escalated";
  escalationReason?: string;
};

export async function logAgentAction(input: LogAgentActionInput) {
  const [action] = await db
    .insert(agentActions)
    .values({
      agentType: input.agentType,
      actionType: input.actionType,
      input: input.input,
      output: input.output,
      status: input.status ?? "pending",
      escalationReason: input.escalationReason,
    })
    .returning();

  return action;
}

// Approve or reject an agent action (human-in-the-loop)
type ReviewActionInput = {
  id: number;
  status: "approved" | "rejected";
  humanResponse?: string;
};

export async function reviewAgentAction(input: ReviewActionInput) {
  const [updated] = await db
    .update(agentActions)
    .set({
      status: input.status,
      humanResponse: input.humanResponse,
    })
    .where(eq(agentActions.id, input.id))
    .returning();

  return updated ?? null;
}
