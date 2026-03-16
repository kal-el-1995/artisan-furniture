// ─── Agent Hooks ────────────────────────────────────────────
// Custom hooks for fetching AI agent actions and escalations.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

// ── Types ───────────────────────────────────────────────────

export type AgentAction = {
  id: number;
  agentType: string;
  actionType: string;
  orderId: number | null;
  inputData: unknown;
  outputData: unknown;
  confidence: string | null;
  status: string;
  humanReviewStatus: string;
  humanReviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

// ── Hooks ───────────────────────────────────────────────────

// Fetch all agent actions
export function useAgentActions() {
  return useQuery({
    queryKey: ["agent-actions"],
    queryFn: () => api.get<AgentAction[]>("/api/agent"),
  });
}

// Fetch only pending escalations (need human review)
export function usePendingEscalations() {
  return useQuery({
    queryKey: ["agent-actions", "pending"],
    queryFn: () => api.get<AgentAction[]>("/api/agent/pending"),
  });
}

// Review (approve/reject) an agent action
export function useReviewAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: number;
      status: "approved" | "rejected";
      notes?: string;
    }) => api.patch<AgentAction>(`/api/agent/${id}/review`, { status, notes }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-actions"] });
    },
  });
}
