// ─── Summary Store ──────────────────────────────────────────
// A tiny global store that holds the latest supervisor summary.
// This lives outside of React so it persists when the Agent
// Control page unmounts (when you switch tabs).
//
// Components subscribe via useSyncExternalStore (React 18+).

let summary: string | null = null;
let waiting = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export const summaryStore = {
  getSummary: () => summary,
  isWaiting: () => waiting,

  startGenerating() {
    summary = null;
    waiting = true;
    notify();
  },

  setSummary(text: string) {
    summary = text;
    waiting = false;
    notify();
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
