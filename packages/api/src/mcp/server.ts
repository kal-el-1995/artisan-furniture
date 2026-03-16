// ─── MCP Server ─────────────────────────────────────────────
// This creates the MCP server with all tools and resources registered.
// It uses stdio transport, meaning it communicates via standard input/output.
//
// How it works:
//   - An AI agent (MCP client) starts this process
//   - The agent sends JSON messages to stdin
//   - This server processes them and replies on stdout
//   - Tools and resources call the same service layer as REST routes
//
// To test: you can run this directly with
//   pnpm --filter @artisan/api mcp
// Then type MCP JSON messages into the terminal (or use the MCP Inspector)

import dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(import.meta.dirname, "../../../../.env") });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";

// Create the MCP server
const server = new McpServer({
  name: "artisan-furniture",
  version: "0.1.0",
});

// Register all tools (actions agents can perform)
registerTools(server);

// Register all resources (read-only data agents can access)
registerResources(server);

// Connect via stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr (not stdout — stdout is reserved for MCP messages)
  console.error("Artisan Furniture MCP server running on stdio");
}

main().catch((err) => {
  console.error("MCP server failed to start:", err);
  process.exit(1);
});
