import { describe, it, expect, beforeAll } from "vitest";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env from monorepo root
config({ path: resolve(import.meta.dirname, "../../../../..", ".env") });

import { createLLM } from "../../providers/llm.js";
import { generateSummary } from "../supervisor.agent.js";

/**
 * Supervisor Agent Integration Tests
 *
 * These tests run the full agent loop against real Ollama + real database.
 * The supervisor gathers data from orders, production, and escalations,
 * then generates a structured daily summary.
 *
 * Note: Slow (~2-5 minutes) because the LLM runs on CPU in Docker.
 */

describe("Supervisor Agent", () => {
  const llm = createLLM();

  beforeAll(async () => {
    // Check if Ollama is running before we try anything
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    try {
      const health = await fetch(`${ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!health.ok) throw new Error(`Status ${health.status}`);
      console.log("  [Test Setup] Ollama is running ✓");
    } catch {
      console.warn("  [Test Setup] Ollama is not reachable — skipping supervisor tests");
      console.warn("  [Test Setup] Make sure Docker is running: docker compose up -d");
      throw new Error(
        "Ollama is not running. Start it with: docker compose up -d"
      );
    }
  });

  it("generates a daily summary using real data", async () => {
    const result = await generateSummary(llm);

    // The agent should return a valid result
    expect(result).toBeDefined();
    expect(result.summary).toBeTruthy();
    expect(result.toolsUsed.length).toBeGreaterThan(0);

    // The agent should have at least listed orders
    expect(result.toolsUsed).toContain("list_orders");

    console.log(`  [Test] Tools used: ${result.toolsUsed.join(", ")}`);
    console.log(`  [Test] Summary preview: ${result.summary.substring(0, 300)}...`);
  }, 600_000);
});
