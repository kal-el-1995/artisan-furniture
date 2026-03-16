// ─── Production Hooks ───────────────────────────────────────
// Custom hooks for fetching production task data.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

// ── Types ───────────────────────────────────────────────────

export type ProductionTask = {
  id: number;
  orderItemId: number;
  artisanId: number;
  status: string;
  startedAt: string | null;
  estimatedCompletion: string | null;
  completedAt: string | null;
  qualityCheckStatus: string | null;
  qualityNotes: string | null;
};

export type ProductionTaskDetail = ProductionTask & {
  orderItem: {
    id: number;
    orderId: number;
    productType: string;
    description: string | null;
    material: string | null;
    quantity: number;
    unitPrice: string;
  };
  artisan: {
    id: number;
    name: string;
    workshopName: string | null;
    location: string | null;
  };
};

// ── Hooks ───────────────────────────────────────────────────

// Fetch all production tasks
export function useProductionTasks() {
  return useQuery({
    queryKey: ["production"],
    queryFn: () => api.get<ProductionTask[]>("/api/production"),
  });
}

// Fetch a single task with details (order item, artisan)
export function useProductionTask(id: number) {
  return useQuery({
    queryKey: ["production", id],
    queryFn: () => api.get<ProductionTaskDetail>(`/api/production/${id}`),
  });
}

// Update a production task's status
export function useUpdateProductionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch<ProductionTask>(`/api/production/${id}/status`, { status }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production"] });
    },
  });
}
