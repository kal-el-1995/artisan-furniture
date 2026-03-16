// ─── Orders Page ────────────────────────────────────────────
// Shows all orders in a table with status badges and filters.
// Click a row to expand it and see order items + customer info.
// Quick action buttons let you update order status.

import { useState } from "react";
import { useOrders, useOrder, useUpdateOrderStatus } from "../hooks/useOrders";
import { StatusBadge } from "../components/StatusBadge";

// All possible order statuses for the filter dropdown
const ORDER_STATUSES = [
  "all",
  "draft",
  "confirmed",
  "in_production",
  "quality_check",
  "ready_to_ship",
  "in_transit",
  "customs",
  "delivered",
  "completed",
];

// What status an order can move to next (simplified flow)
const NEXT_STATUS: Record<string, string> = {
  draft: "confirmed",
  confirmed: "in_production",
  in_production: "quality_check",
  quality_check: "ready_to_ship",
  ready_to_ship: "in_transit",
  in_transit: "customs",
  customs: "delivered",
  delivered: "completed",
};

export function OrdersPage() {
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: orders, isLoading, error } = useOrders();
  const updateStatus = useUpdateOrderStatus();

  if (isLoading) {
    return <div className="text-gray-500">Loading orders...</div>;
  }

  if (error) {
    return (
      <div className="text-red-600">
        Failed to load orders: {error.message}
      </div>
    );
  }

  // Apply status filter
  const filtered =
    filter === "all"
      ? orders
      : orders?.filter((o) => o.status === filter);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="mt-1 text-gray-600">
            {filtered?.length} order{filtered?.length !== 1 ? "s" : ""}
            {filter !== "all" ? ` with status "${filter.replace(/_/g, " ")}"` : ""}
          </p>
        </div>

        {/* Filter Dropdown */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All Statuses" : s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Total
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Created
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered?.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                isExpanded={expandedId === order.id}
                onToggle={() =>
                  setExpandedId(expandedId === order.id ? null : order.id)
                }
                onUpdateStatus={(status) =>
                  updateStatus.mutate({ id: order.id, status })
                }
              />
            ))}
          </tbody>
        </table>

        {filtered?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No orders found.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Order Row ──────────────────────────────────────────────
// A single row in the table. Clicking it expands to show details.

function OrderRow({
  order,
  isExpanded,
  onToggle,
  onUpdateStatus,
}: {
  order: { id: number; status: string; orderType: string; totalAmount: string | null; createdAt: string };
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateStatus: (status: string) => void;
}) {
  const nextStatus = NEXT_STATUS[order.status];

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-6 py-4 text-sm font-medium text-gray-900">
          #{order.id}
        </td>
        <td className="px-6 py-4 text-sm text-gray-600 capitalize">
          {order.orderType}
        </td>
        <td className="px-6 py-4">
          <StatusBadge status={order.status} />
        </td>
        <td className="px-6 py-4 text-sm text-gray-900">
          {order.totalAmount ? `$${Number(order.totalAmount).toLocaleString()}` : "—"}
        </td>
        <td className="px-6 py-4 text-sm text-gray-600">
          {new Date(order.createdAt).toLocaleDateString()}
        </td>
        <td className="px-6 py-4">
          {nextStatus && (
            <button
              onClick={(e) => {
                e.stopPropagation(); // Don't expand the row
                onUpdateStatus(nextStatus);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              → {nextStatus.replace(/_/g, " ")}
            </button>
          )}
        </td>
      </tr>

      {/* Expanded Detail Row */}
      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-6 py-4 bg-gray-50">
            <OrderDetail orderId={order.id} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Order Detail ───────────────────────────────────────────
// Expanded view showing customer info and order items.

function OrderDetail({ orderId }: { orderId: number }) {
  const { data: order, isLoading } = useOrder(orderId);

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading details...</div>;
  }

  if (!order) {
    return <div className="text-sm text-red-600">Order not found</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Customer Info */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">Customer</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>{order.customer?.name || "Unknown"}</p>
          <p>{order.customer?.email || "—"}</p>
          <p>{order.customer?.phone || "—"}</p>
        </div>
        {order.showroomNotes && (
          <div className="mt-3">
            <h3 className="text-sm font-medium text-gray-900 mb-1">Notes</h3>
            <p className="text-sm text-gray-600">{order.showroomNotes}</p>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Items ({order.items?.length || 0})
        </h3>
        {order.items && order.items.length > 0 ? (
          <div className="space-y-2">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {item.productType.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.material || "—"} · Qty: {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    ${Number(item.unitPrice).toLocaleString()}
                  </p>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No items</p>
        )}
      </div>
    </div>
  );
}
