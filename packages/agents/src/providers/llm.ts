/**
 * LLM Provider Abstraction
 *
 * This file defines the "universal remote" interface for talking to any AI model.
 * Right now we only have Ollama (free, local). Later, swapping to Claude API
 * is just changing LLM_PROVIDER in .env — no agent code changes needed.
 */

// --- Types ---

/**
 * A single message in a conversation.
 * - "system" = instructions for the AI (like a job description)
 * - "user" = a question or task from our code
 * - "assistant" = a response from the AI
 * - "tool" = the result of a tool the AI asked to call
 */
export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** When role is "assistant" and the AI wants to call tools */
  tool_calls?: ToolCall[];
  /** When role is "tool", which tool this result is for */
  tool_name?: string;
}

/**
 * A tool the AI can ask to use (like "get_order" or "list_customers").
 * This follows the standard function-calling format that both Ollama and
 * cloud APIs understand.
 */
export interface Tool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
      }>;
      required?: string[];
    };
  };
}

/**
 * When the AI decides to call a tool, it returns one of these.
 * For example: { function: { name: "get_order", arguments: { id: 5 } } }
 */
export interface ToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

/**
 * The response we get back from any LLM provider.
 */
export interface LLMResponse {
  /** The text content of the response (may be empty if tool_calls are present) */
  content: string;
  /** Tools the AI wants to call (empty array if none) */
  tool_calls: ToolCall[];
  /** Whether the AI stopped because it wants to call tools */
  wants_tool_call: boolean;
}

/**
 * The interface every LLM provider must implement.
 * This is the "universal remote" — one method, works with any AI.
 */
export interface LLMProvider {
  /** Send a conversation to the AI and get a response back */
  chat(messages: Message[], tools?: Tool[]): Promise<LLMResponse>;
}

// --- Factory ---

import { OllamaProvider } from "./ollama.js";

/**
 * Creates the right LLM provider based on your .env settings.
 *
 * Usage:
 *   const llm = createLLM();
 *   const response = await llm.chat([{ role: "user", content: "Hello!" }]);
 */
export function createLLM(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || "ollama";

  switch (provider) {
    case "ollama":
      return new OllamaProvider();
    default:
      throw new Error(
        `Unknown LLM_PROVIDER: "${provider}". Supported: ollama`
      );
  }
}
