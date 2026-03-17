# PRODUCTION-NOTES.md — Artisan Furniture Co.

Notes on upgrades, tools, and decisions to revisit when moving from POC to production. These don't affect the current build — they're "remember this later" items discovered during development.

---

## LLM Provider Upgrade Path

| POC (Now) | Production (Later) | How to Switch |
|-----------|-------------------|---------------|
| Ollama + Llama 3.1 8B (local, free) | Claude API via Anthropic | Add `providers/anthropic.ts`, set `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` in `.env` |
| Single LLM provider | Multiple providers | Factory in `providers/llm.ts` already supports this — just add new cases |
| CPU inference in Docker (~10-45s per call) | Cloud API (~1-3s per call) | Automatic once provider is swapped |

## Anthropic Tools to Evaluate for Production

### Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)
- **What:** Official SDK for building AI agents with Claude. Includes built-in tools (file read/write, bash, search), subagents, MCP support, hooks, sessions.
- **Why it matters:** Could replace our hand-rolled agent loop with a battle-tested framework. Supports subagents (Order Agent + Supervisor pattern) natively.
- **Why not for POC:** Requires `ANTHROPIC_API_KEY` — Claude-only, doesn't work with Ollama.
- **When to evaluate:** When moving to production and switching `LLM_PROVIDER=anthropic`.
- **Docs:** https://platform.claude.com/docs/en/agent-sdk/overview

### MCP Elicitation
- **What:** MCP servers can now request structured input from users mid-task via interactive dialogs.
- **Why it matters:** Could enhance the escalation flow — instead of just flagging "needs human review", the agent could ask specific questions ("Should we proceed with this wood type?" with Yes/No options).
- **When to evaluate:** Phase 6 or production.

### Agent Teams (Opus 4.6)
- **What:** Multiple Claude agents working in parallel on sub-tasks and coordinating.
- **Why it matters:** Mirrors our Order Agent + Supervisor pattern. Could make the Supervisor smarter in production.
- **Note:** This is a Claude Code feature, not embeddable in our app. More relevant if we use Claude Agent SDK.

## Prompt Engineering References

### Agency-Agents Repository (MIT License)
- **Repo:** https://github.com/msitarzewski/agency-agents
- **What we used:** Prompt patterns from three agent definitions:
  - `specialized/agents-orchestrator.md` — sequential phase management, quality gates with retry logic (max 3 retries then escalate), status reporting
  - `project-management/project-management-project-shepherd.md` — risk identification, escalation with recommended solutions, health monitoring
  - `support/support-executive-summary-generator.md` — structured report template (situation, findings, impact, recommendations, next steps), quantified data points
- **How we applied it:** Inspired the structure of our Order Agent and Supervisor Agent system prompts

## Docker / Infrastructure Notes

- Docker Desktop memory: increased to 10 GB for Llama 3.1 8B (4.8 GB model + overhead)
- Ollama in Docker runs on CPU only (no Apple Silicon GPU access) — production should consider native Ollama or cloud API for speed
- First LLM call after model load takes ~45s, subsequent calls ~10s

---

*Last updated: 2026-03-16*
