/**
 * Tool Helpers
 *
 * Thin wrappers around database operations that agent tools need.
 * These exist so the agent package can log actions directly to the DB
 * without importing from the API package (which would create a
 * circular dependency).
 */

import { db, agentActions } from "@artisan/db";

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
