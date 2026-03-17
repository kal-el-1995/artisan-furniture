/**
 * @artisan/agents — AI Agent Package
 *
 * This package contains:
 * - LLM provider abstraction (Ollama for POC, Claude API for production)
 * - Order Agent: auto-processes new orders, escalates edge cases
 * - Supervisor Agent: monitors Order Agent, generates daily summaries
 */

export { createLLM } from "./providers/llm.js";
export { processOrder } from "./agents/order.agent.js";
export type { OrderAgentResult } from "./agents/order.agent.js";
export { generateSummary } from "./agents/supervisor.agent.js";
export type { SupervisorAgentResult } from "./agents/supervisor.agent.js";
