// ─── Dashboard Layout ───────────────────────────────────────
// The shell that wraps every page. Has a sidebar on the left
// with navigation links, and a header + content area on the right.

import { NavLink, Outlet, useLocation } from "react-router";

// Navigation items — each one maps to a page
const navItems = [
  { to: "/", label: "Orders", icon: "📦" },
  { to: "/production", label: "Production", icon: "🔨" },
  { to: "/agent", label: "Agent Control", icon: "🤖" },
];

// Map route paths to page titles
const pageTitles: Record<string, string> = {
  "/": "Orders",
  "/production": "Production Board",
  "/agent": "Agent Control",
};

export function Layout() {
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || "Dashboard";

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col flex-shrink-0">
        {/* Logo / Brand */}
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-bold tracking-tight">
            Artisan Furniture
          </h2>
          <p className="text-xs text-gray-400 mt-1">Management Dashboard</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs text-gray-500">POC v0.1.0</span>
          </div>
        </div>
      </aside>

      {/* ── Main Area ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-8 flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-700">{pageTitle}</h1>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-auto">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
