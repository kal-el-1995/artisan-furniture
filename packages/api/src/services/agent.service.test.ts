import { describe, it, expect } from "vitest";
import {
  listAgentActions,
  getPendingActions,
  logAgentAction,
  reviewAgentAction,
} from "./agent.service.js";

describe("Agent Service", () => {
  it("should list all agent actions", async () => {
    const actions = await listAgentActions();
    expect(actions.length).toBeGreaterThanOrEqual(4);
  });

  it("should get pending actions only", async () => {
    const pending = await getPendingActions();
    // All returned actions should have status "pending"
    for (const action of pending) {
      expect(action.status).toBe("pending");
    }
  });

  it("should log a new agent action", async () => {
    const action = await logAgentAction({
      agentType: "order",
      actionType: "test_action",
      input: { test: true },
      output: { result: "ok" },
    });
    expect(action).toBeDefined();
    expect(action.status).toBe("pending"); // default
    expect(action.agentType).toBe("order");
  });

  it("should log an escalated action", async () => {
    const action = await logAgentAction({
      agentType: "order",
      actionType: "price_check",
      input: { orderId: 5 },
      output: { flagged: true },
      status: "escalated",
      escalationReason: "Price exceeds threshold",
    });
    expect(action.status).toBe("escalated");
    expect(action.escalationReason).toBe("Price exceeds threshold");
  });

  it("should approve an agent action with human response", async () => {
    // First create an action to review
    const action = await logAgentAction({
      agentType: "test",
      actionType: "review_test",
      input: {},
      output: {},
    });

    const reviewed = await reviewAgentAction({
      id: action.id,
      status: "approved",
      humanResponse: "Approved by test",
    });

    expect(reviewed).not.toBeNull();
    expect(reviewed!.status).toBe("approved");
    expect(reviewed!.humanResponse).toBe("Approved by test");
  });

  it("should return null when reviewing non-existent action", async () => {
    const result = await reviewAgentAction({
      id: 99999,
      status: "rejected",
    });
    expect(result).toBeNull();
  });
});
