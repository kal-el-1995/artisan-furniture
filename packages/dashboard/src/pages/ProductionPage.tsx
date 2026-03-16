// ─── Production Page ────────────────────────────────────────
// A Kanban board showing production tasks organized by status.
// Each column is a stage, and cards show what's being made,
// by whom, and when. Click a card's button to advance its status.

import { useProductionTasks, useProductionTask, useUpdateProductionStatus } from "../hooks/useProduction";
import { StatusBadge } from "../components/StatusBadge";
import { useState } from "react";

// Kanban columns — each maps to a production status
const COLUMNS = [
  { key: "pending", label: "Pending", color: "border-gray-300" },
  { key: "assigned", label: "Assigned", color: "border-blue-300" },
  { key: "in_progress", label: "In Progress", color: "border-yellow-300" },
  { key: "quality_check", label: "Quality Check", color: "border-purple-300" },
  { key: "approved", label: "Approved", color: "border-green-300" },
  { key: "rejected", label: "Rejected", color: "border-red-300" },
];

// What status a task can move to next
const NEXT_STATUS: Record<string, string> = {
  pending: "assigned",
  assigned: "in_progress",
  in_progress: "quality_check",
  quality_check: "approved",
};

export function ProductionPage() {
  const { data: tasks, isLoading, error } = useProductionTasks();
  const updateStatus = useUpdateProductionStatus();

  if (isLoading) {
    return <div className="text-gray-500">Loading production board...</div>;
  }

  if (error) {
    return <div className="text-red-600">Failed to load: {error.message}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Production Board</h1>
      <p className="mt-1 text-gray-600 mb-6">
        {tasks?.length} task{tasks?.length !== 1 ? "s" : ""} across all stages
      </p>

      {/* Kanban Board — horizontal scroll if needed */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => {
          // Filter tasks for this column
          const columnTasks = tasks?.filter((t) => t.status === column.key) || [];

          return (
            <div
              key={column.key}
              className={`flex-shrink-0 w-72 bg-gray-100 rounded-lg border-t-4 ${column.color}`}
            >
              {/* Column Header */}
              <div className="p-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">
                  {column.label}
                </h2>
                <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[200px]">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    taskId={task.id}
                    status={task.status}
                    onAdvance={() => {
                      const next = NEXT_STATUS[task.status];
                      if (next) {
                        updateStatus.mutate({ id: task.id, status: next });
                      }
                    }}
                  />
                ))}

                {columnTasks.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-8">
                    No tasks
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Task Card ──────────────────────────────────────────────
// A single card on the Kanban board. Fetches its own details
// (order item, artisan) so the board loads fast initially.

function TaskCard({
  taskId,
  status,
  onAdvance,
}: {
  taskId: number;
  status: string;
  onAdvance: () => void;
}) {
  const { data: task } = useProductionTask(taskId);
  const [showDetails, setShowDetails] = useState(false);
  const nextStatus = NEXT_STATUS[status];

  return (
    <div
      className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setShowDetails(!showDetails)}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">Task #{taskId}</span>
        <StatusBadge status={status} />
      </div>

      {/* Product Info */}
      <p className="text-sm font-medium text-gray-900 capitalize">
        {task?.orderItem?.productType?.replace(/_/g, " ") || "Loading..."}
      </p>

      {/* Artisan */}
      <p className="text-xs text-gray-500 mt-1">
        {task?.artisan?.name || "—"}{" "}
        {task?.artisan?.location ? `· ${task.artisan.location}` : ""}
      </p>

      {/* Expanded Details */}
      {showDetails && task && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600 space-y-1">
          {task.orderItem?.material && (
            <p>Material: {task.orderItem.material}</p>
          )}
          {task.orderItem?.description && (
            <p>{task.orderItem.description}</p>
          )}
          {task.startedAt && (
            <p>Started: {new Date(task.startedAt).toLocaleDateString()}</p>
          )}
          {task.completedAt && (
            <p>Completed: {new Date(task.completedAt).toLocaleDateString()}</p>
          )}
          {task.artisan?.workshopName && (
            <p>Workshop: {task.artisan.workshopName}</p>
          )}
        </div>
      )}

      {/* Advance Button */}
      {nextStatus && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdvance();
          }}
          className="mt-2 w-full text-xs font-medium py-1.5 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
        >
          → {nextStatus.replace(/_/g, " ")}
        </button>
      )}
    </div>
  );
}
