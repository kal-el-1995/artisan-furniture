import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vite config — tells Vite how to build and serve our React app.
export default defineConfig({
  plugins: [
    react(),        // Enables JSX/TSX and React Fast Refresh (auto-reload)
    tailwindcss(),  // Processes Tailwind CSS classes
  ],
  server: {
    port: 5173,     // Dashboard runs on this port during development
    proxy: {
      // Forward API requests to our Fastify server.
      // When the dashboard calls "/api/orders", Vite sends it to localhost:3000.
      // This avoids CORS issues during development.
      "/api": "http://localhost:3000",
    },
  },
});
