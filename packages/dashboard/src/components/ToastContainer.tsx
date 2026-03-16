// ─── Toast Container ────────────────────────────────────────
// Renders toast notifications in the bottom-right corner.
// Toasts pop in, display for 5 seconds, then fade out.

import { useState, useEffect } from "react";
import { onToastsChange, removeToast, type Toast } from "../lib/toast";

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    onToastsChange(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm flex items-center justify-between gap-3 animate-slide-in"
        >
          <span>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-gray-400 hover:text-white text-lg leading-none"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
