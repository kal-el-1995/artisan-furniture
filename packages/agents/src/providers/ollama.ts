/**
 * Ollama Provider
 *
 * Talks to Ollama's local API at http://localhost:11434.
 * Ollama runs Llama 3.1 8B on your Mac — completely free, no internet needed.
 *
 * API docs: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

import type { LLMProvider, LLMResponse, Message, Tool } from "./llm.js";

/**
 * The shape of Ollama's /api/chat response.
 * We only define the fields we actually use.
 */
interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
    tool_calls?: Array<{
      function: {
        name: string;
        arguments: Record<string, unknown>;
      };
    }>;
  };
  done: boolean;
  done_reason?: string;
}

export class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;

  constructor() {
    // Read from .env, with sensible defaults
    this.baseUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    this.model = process.env.LLM_MODEL || "llama3.1";
  }

  async chat(messages: Message[], tools?: Tool[]): Promise<LLMResponse> {
    // Build the request body for Ollama's /api/chat endpoint
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map((msg) => {
        const formatted: Record<string, unknown> = {
          role: msg.role,
          content: msg.content,
        };
        // Include tool_calls if the assistant made them (for conversation history)
        if (msg.tool_calls) {
          formatted.tool_calls = msg.tool_calls;
        }
        // Include tool_name if this is a tool result message
        if (msg.tool_name) {
          formatted.tool_name = msg.tool_name;
        }
        return formatted;
      }),
      stream: false, // We want the full response at once, not streamed
    };

    // Only include tools if we have any
    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    // Set a timeout so a single LLM call can't hang forever.
    // Default: 120 seconds (Ollama on CPU can be slow).
    const timeoutMs = Number(process.env.LLM_TIMEOUT_MS) || 300_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Make the HTTP request to Ollama
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Ollama request timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
    clearTimeout(timer);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as OllamaChatResponse;

    // Extract tool calls if the AI wants to use tools
    const toolCalls = data.message.tool_calls || [];

    return {
      content: data.message.content || "",
      tool_calls: toolCalls,
      wants_tool_call: toolCalls.length > 0,
    };
  }
}
