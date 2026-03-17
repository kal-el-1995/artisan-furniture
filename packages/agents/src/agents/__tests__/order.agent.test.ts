import { describe, it, expect, beforeAll } from "vitest";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env from monorepo root
config({ path: resolve(import.meta.dirname, "../../../../..", ".env") });

import { createLLM } from "../../providers/llm.js";
import { processOrder } from "../order.agent.js";
import { db, orders, orderItems, customers } from "@artisan/db";
import { eq } from "drizzle-orm";

/**
 * Order Agent Integration Tests
 *
 * These tests run the full agent loop against real Ollama + real database.
 * They use existing seed data — make sure `pnpm db:seed` has been run.
 *
 * Note: These tests are slow (~30-60s each) because the LLM runs locally
 * on CPU inside Docker. That's expected for the POC.
 */

describe("Order Agent", () => {
  const llm = createLLM();

  // Find a draft order from seed data to test with
  let draftOrderId: number;

  beforeAll(async () => {
    // Check if Ollama is running before we try anything.
    // If it's down, skip the entire suite with a clear message
    // instead of hanging for minutes.
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    try {
      const health = await fetch(`${ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!health.ok) throw new Error(`Status ${health.status}`);
      console.log("  [Test Setup] Ollama is running ✓");
    } catch {
      console.warn("  [Test Setup] Ollama is not reachable — skipping agent tests");
      console.warn(`  [Test Setup] Make sure Docker is running: docker compose up -d`);
      // This throws a special vitest error that skips the suite
      throw new Error(
        "Ollama is not running. Start it with: docker compose up -d"
      );
    }

    // Find a draft order — seed data should have at least one
    const draftOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.status, "draft"));

    if (draftOrders.length === 0) {
      // Create a test order if no drafts exist
      const [customer] = await db.select().from(customers).limit(1);
      const [order] = await db
        .insert(orders)
        .values({
          customerId: customer.id,
          orderType: "custom",
          totalAmount: "2500.00",
          showroomNotes: "Test order for agent testing",
        })
        .returning();

      // Add an item to the order
      await db.insert(orderItems).values({
        orderId: order.id,
        productType: "dining_table",
        material: "Teak wood",
        description: "6-seater dining table",
        quantity: 1,
        unitPrice: "2500.00",
      });

      draftOrderId = order.id;
    } else {
      draftOrderId = draftOrders[0].id;
    }

    console.log(`  [Test Setup] Using draft order #${draftOrderId}`);
  });

  it("processes an order and returns a result", async () => {
    const result = await processOrder(llm, draftOrderId);

    // The agent should return a valid result
    expect(result).toBeDefined();
    expect(result.orderId).toBe(draftOrderId);
    expect(["confirmed", "escalated", "error"]).toContain(result.decision);
    expect(result.reasoning).toBeTruthy();
    expect(result.toolsUsed.length).toBeGreaterThan(0);

    // The agent should have at least fetched the order
    expect(result.toolsUsed).toContain("get_order");

    console.log(`  [Test] Decision: ${result.decision}`);
    console.log(`  [Test] Tools used: ${result.toolsUsed.join(", ")}`);
    console.log(`  [Test] Reasoning: ${result.reasoning.substring(0, 200)}...`);
  }, 600_000); // 10 minute timeout — LLM on CPU can be slow with multiple tool calls
});
