// ─── Agent Control Page ─────────────────────────────────────
// Human-in-the-loop UI for reviewing AI agent actions.
// Two sections:
// 1. Pending Escalations — approve or reject agent proposals
// 2. Recent Activity — feed of all agent actions

import { useState, useEffect } from "react";
import {
  useAgentActions,
  usePendingEscalations,
  useReviewAction,
  useGenerateSummary,
} from "../hooks/useAgent";
import { StatusBadge } from "../components/StatusBadge";

export function AgentControlPage() {
  const { data: pending, isLoading: loadingPending } = usePendingEscalations();
  const { data: allActions, isLoading: loadingAll } = useAgentActions();
  const generateSummary = useGenerateSummary();
  const [summaryText, setSummaryText] = useState<string | null>(null);

  // Listen for real-time summary results via Socket.io
  useEffect(() => {
    // We import io dynamically to avoid duplicate connections
    // (useSocket in Layout.tsx handles the main connection)
    import("socket.io-client").then(({ io }) => {
      const socket = io("http://localhost:3000", {
        transports: ["websocket", "polling"],
      });

      socket.on("agent:summary", (data: { summary: string }) => {
        setSummaryText(data.summary);
      });

      return () => { socket.disconnect(); };
    });
  }, []);

  if (loadingPending || loadingAll) {
    return <div className="text-gray-500">Loading agent data...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Agent Control</h1>
      <p className="mt-1 text-gray-600 mb-6">
        Review AI agent actions and approve escalations.
      </p>

      {/* Supervisor Summary */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Daily Operations Summary
          </h2>
          <button
            onClick={() => {
              setSummaryText(null);
              generateSummary.mutate();
            }}
            disabled={generateSummary.isPending}
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {generateSummary.isPending ? "Queued..." : "Generate Summary"}
          </button>
        </div>

        {generateSummary.isPending && !summaryText && (
          <div className="bg-blue-50 text-blue-700 text-sm p-4 rounded-lg">
            Supervisor Agent is generating a summary. This may take a few minutes
            (the LLM runs locally on CPU). The result will appear here automatically.
          </div>
        )}

        {summaryText && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
              {summaryText}
            </pre>
          </div>
        )}

        {!generateSummary.isPending && !summaryText && (
          <div className="bg-gray-50 text-gray-500 text-sm p-4 rounded-lg">
            Click "Generate Summary" to have the Supervisor Agent analyze current operations.
          </div>
        )}
      </section>

      {/* Pending Escalations */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          Pending Escalations
          {pending && pending.length > 0 && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </h2>

        {pending && pending.length > 0 ? (
          <div className="space-y-3">
            {pending.map((action) => (
              <EscalationCard key={action.id} action={action} />
            ))}
          </div>
        ) : (
          <div className="bg-green-50 text-green-700 text-sm p-4 rounded-lg">
            No pending escalations. All clear!
          </div>
        )}
      </section>

      {/* Recent Activity Feed */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Recent Activity
        </h2>

        {allActions && allActions.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    ID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Agent
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Order
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Confidence
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Review
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    When
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allActions.map((action) => (
                  <tr key={action.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      #{action.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                      {action.agentType.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                      {action.actionType.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {action.orderId ? `#${action.orderId}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {action.confidence ? (
                        <ConfidenceBar value={Number(action.confidence)} />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={action.status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={action.humanReviewStatus} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(action.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No agent activity yet.</p>
        )}
      </section>
    </div>
  );
}

// ─── Escalation Card ────────────────────────────────────────
// Shows what the agent proposed and lets you approve or reject.

function EscalationCard({
  action,
}: {
  action: {
    id: number;
    agentType: string;
    actionType: string;
    orderId: number | null;
    confidence: string | null;
    inputData: unknown;
    outputData: unknown;
    createdAt: string;
  };
}) {
  const reviewAction = useReviewAction();
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  function handleReview(status: "approved" | "rejected") {
    reviewAction.mutate({
      id: action.id,
      status,
      notes: notes || undefined,
    });
  }

  return (
    <div className="bg-white rounded-lg shadow border border-yellow-200 p-4">
      <div className="flex items-start justify-between">
        {/* Left: Action details */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 capitalize">
              {action.actionType.replace(/_/g, " ")}
            </span>
            <span className="text-xs text-gray-500">
              by {action.agentType.replace(/_/g, " ")} agent
            </span>
          </div>

          {action.orderId && (
            <p className="text-sm text-gray-600">Order #{action.orderId}</p>
          )}

          {action.confidence && (
            <div className="mt-2">
              <ConfidenceBar value={Number(action.confidence)} />
            </div>
          )}

          {/* Show what the agent proposed */}
          {action.outputData != null && (
            <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <p className="font-medium mb-1">Agent output:</p>
              <pre className="whitespace-pre-wrap">
                {String(JSON.stringify(action.outputData, null, 2))}
              </pre>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-2">
            {new Date(action.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Right: Action buttons */}
        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={() => handleReview("approved")}
            disabled={reviewAction.isPending}
            className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => {
              if (showNotes) {
                handleReview("rejected");
              } else {
                setShowNotes(true);
              }
            }}
            disabled={reviewAction.isPending}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showNotes ? "Hide notes" : "Add notes"}
          </button>
        </div>
      </div>

      {/* Notes Input */}
      {showNotes && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional review notes..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none h-20 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
          />
        </div>
      )}
    </div>
  );
}

// ─── Confidence Bar ─────────────────────────────────────────
// Visual indicator of how confident the AI agent was (0–1).

function ConfidenceBar({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  const color =
    percent >= 80
      ? "bg-green-500"
      : percent >= 50
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-gray-600">{percent}%</span>
    </div>
  );
}
