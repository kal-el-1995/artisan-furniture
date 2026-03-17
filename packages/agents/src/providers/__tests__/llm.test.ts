import { describe, it, expect, beforeAll } from "vitest";
import { createLLM } from "../llm.js";
import type { LLMProvider, Tool } from "../llm.js";

/**
 * These tests talk to the real Ollama instance running in Docker.
 * Make sure `docker compose up -d` is running before running tests.
 */

// Load .env from monorepo root
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(import.meta.dirname, "../../../../..", ".env") });

describe("LLM Provider", () => {
  let llm: LLMProvider;

  beforeAll(() => {
    llm = createLLM();
  });

  it("creates an Ollama provider by default", () => {
    expect(llm).toBeDefined();
    expect(llm.chat).toBeInstanceOf(Function);
  });

  it("sends a simple message and gets a response", async () => {
    const response = await llm.chat([
      { role: "user", content: "Reply with exactly: HELLO" },
    ]);

    expect(response.content).toBeTruthy();
    expect(response.content.toUpperCase()).toContain("HELLO");
    expect(response.tool_calls).toEqual([]);
    expect(response.wants_tool_call).toBe(false);
  }, 60_000); // 60 second timeout — local LLM can be slow on first load

  it("supports tool calling", async () => {
    const tools: Tool[] = [
      {
        type: "function",
        function: {
          name: "get_weather",
          description: "Get the current weather for a city",
          parameters: {
            type: "object",
            properties: {
              city: {
                type: "string",
                description: "The city name",
              },
            },
            required: ["city"],
          },
        },
      },
    ];

    const response = await llm.chat(
      [{ role: "user", content: "What is the weather in Tokyo?" }],
      tools
    );

    // The model should want to call the get_weather tool
    expect(response.wants_tool_call).toBe(true);
    expect(response.tool_calls.length).toBeGreaterThan(0);
    expect(response.tool_calls[0].function.name).toBe("get_weather");
    expect(response.tool_calls[0].function.arguments).toHaveProperty("city");
  }, 120_000); // 2 min — tool calling is slower than simple chat
});
