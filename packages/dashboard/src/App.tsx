// ─── App ────────────────────────────────────────────────────
// The root component. Sets up:
// 1. TanStack Query — manages all server data (caching, refetch)
// 2. React Router  — URL-based page navigation
// 3. Auth gate     — shows login screen until authenticated
// 4. Socket.io     — real-time updates from the API server
// 5. Toast         — pop-up notifications in the corner

import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/Layout";
import { LoginForm } from "./components/LoginForm";
import { ToastContainer } from "./components/ToastContainer";
import { OrdersPage } from "./pages/OrdersPage";
import { ProductionPage } from "./pages/ProductionPage";
import { AgentControlPage } from "./pages/AgentControlPage";
import { useSocket } from "./hooks/useSocket";

// Create a QueryClient — this is the "brain" of TanStack Query.
// It holds the cache of all fetched data and manages refetching.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

// Inner component that uses hooks (must be inside QueryClientProvider)
function Dashboard() {
  // Connect to Socket.io for real-time updates
  useSocket();

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<OrdersPage />} />
          <Route path="production" element={<ProductionPage />} />
          <Route path="agent" element={<AgentControlPage />} />
        </Route>
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <LoginForm onSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}
