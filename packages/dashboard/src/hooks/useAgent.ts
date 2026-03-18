// ─── Agent Hooks ────────────────────────────────────────────
// Custom hooks for fetching AI agent actions and escalations.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

// ── Types ───────────────────────────────────────────────────

export type AgentAction = {
  id: number;
  agentType: string;
  actionType: string;
  input: unknown;
  output: unknown;
  status: string;
  escalationReason: string | null;
  humanResponse: string | null;
  createdAt: string;
};

// ── Hooks ───────────────────────────────────────────────────

// Fetch all agent actions
export function useAgentActions() {
  return useQuery({
    queryKey: ["agent-actions"],
    queryFn: () => api.get<AgentAction[]>("/api/agent/actions"),
  });
}

// Fetch only pending escalations (need human review)
export function usePendingEscalations() {
  return useQuery({
    queryKey: ["agent-actions", "pending"],
    queryFn: () => api.get<AgentAction[]>("/api/agent/actions/pending"),
  });
}

// Trigger the Supervisor Agent to generate a daily summary
export function useGenerateSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<{ message: string }>("/api/agent/summary", {}),
    onSuccess: () => {
      // Refresh agent actions list (the summary gets logged as an action)
      queryClient.invalidateQueries({ queryKey: ["agent-actions"] });
    },
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
    }) => api.patch<AgentAction>(`/api/agent/actions/${id}`, { status, humanResponse: notes }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-actions"] });
    },
  });
}
