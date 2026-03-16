// ─── Status Badge ───────────────────────────────────────────
// A small colored pill that shows the status of an order,
// production task, or shipment. Each status gets a different
// color so you can tell at a glance what's going on.

// Map each status to a color scheme
const statusColors: Record<string, string> = {
  // Order statuses
  draft: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_production: "bg-yellow-100 text-yellow-700",
  quality_check: "bg-purple-100 text-purple-700",
  ready_to_ship: "bg-indigo-100 text-indigo-700",
  in_transit: "bg-orange-100 text-orange-700",
  customs: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",

  // Production statuses
  pending: "bg-gray-100 text-gray-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  rework: "bg-orange-100 text-orange-700",

  // Agent statuses
  pending_review: "bg-yellow-100 text-yellow-700",
  auto_approved: "bg-green-100 text-green-700",
};

// Format status for display: "in_production" → "In Production"
function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function StatusBadge({ status }: { status: string }) {
  const colors = statusColors[status] || "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors}`}
    >
      {formatStatus(status)}
    </span>
  );
}
