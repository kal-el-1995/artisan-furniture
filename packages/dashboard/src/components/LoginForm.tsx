// ─── Login Form ─────────────────────────────────────────────
// A simple login screen shown before the dashboard.

import { useState } from "react";
import { login } from "../lib/api";

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const success = await login(username, password);

    if (success) {
      onSuccess();
    } else {
      setError("Invalid username or password");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Artisan Furniture
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sign in to the management dashboard
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <label className="block mb-4">
          <span className="text-sm font-medium text-gray-700">Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-shadow"
          />
        </label>

        <label className="block mb-6">
          <span className="text-sm font-medium text-gray-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-shadow"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
