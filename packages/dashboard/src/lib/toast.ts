// ─── Toast Notifications ────────────────────────────────────
// A simple toast system. Toasts are small messages that pop up
// in the corner of the screen and disappear after a few seconds.
//
// We use a callback pattern so the React component can subscribe
// to new toasts and render them.

export type Toast = {
  id: number;
  message: string;
};

type ToastListener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
let nextId = 1;
let listener: ToastListener | null = null;

// Subscribe to toast changes (called by the ToastContainer component)
export function onToastsChange(fn: ToastListener) {
  listener = fn;
}

// Add a new toast. It auto-removes after 5 seconds.
export function addToast(message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, message }];
  listener?.(toasts);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    removeToast(id);
  }, 5000);
}

// Remove a toast by ID
export function removeToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  listener?.(toasts);
}
