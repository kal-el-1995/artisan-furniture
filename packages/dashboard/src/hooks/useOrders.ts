// ─── Order Hooks ────────────────────────────────────────────
// Custom React hooks for fetching order data using TanStack Query.
//
// What is a hook? A reusable function that "hooks into" React features.
// These hooks handle fetching, caching, loading states, and errors
// so our page components stay simple.
//
// Usage in a component:
//   const { data: orders, isLoading } = useOrders();

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

// ── Types ───────────────────────────────────────────────────
// These describe the shape of data we get back from the API.

export type Order = {
  id: number;
  customerId: number;
  status: string;
  orderType: string;
  totalAmount: string | null;
  depositAmount: string | null;
  showroomNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderDetail = Order & {
  customer: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  };
  items: {
    id: number;
    productType: string;
    description: string | null;
    material: string | null;
    quantity: number;
    unitPrice: string;
    status: string;
  }[];
};

// ── Hooks ───────────────────────────────────────────────────

// Fetch all orders
export function useOrders() {
  return useQuery({
    queryKey: ["orders"],           // Unique cache key
    queryFn: () => api.get<Order[]>("/api/orders"),
  });
}

// Fetch a single order with details (customer, items)
export function useOrder(id: number) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => api.get<OrderDetail>(`/api/orders/${id}`),
  });
}

// Update an order's status (returns a mutation function)
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch<Order>(`/api/orders/${id}/status`, { status }),

    // After a successful update, refresh the orders list
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
