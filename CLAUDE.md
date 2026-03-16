# CLAUDE.md — Artisan Furniture Co.

This file is read by Claude at the start of every session. It ensures consistent context, teaching style, and technical decisions without needing to repeat them.

---

## 1. Project Overview

Artisan Furniture Co. is a premium handcrafted furniture business: furniture is made by skilled artisans in India and sold to customers in the United States. The platform manages the entire workflow — from customer order intake at a US showroom, through manufacturing coordination with Indian artisans, international shipping and customs, and final delivery — with AI agents handling routine operations autonomously. The platform is **MCP-native**: every business operation is exposed as an MCP (Model Context Protocol) tool, meaning both human dashboards and AI agents share the same backend interface. This is what makes semi-autonomous AI-driven operations possible.

---

## 2. Current Phase: POC (Proof of Concept)

We are building a **free, local, fully functional prototype** that proves the entire architecture works end-to-end — before spending any money on production infrastructure. Everything runs on your local machine via Docker. Zero hosting cost. Zero API fees.

This is not a toy — the POC code carries forward directly to production. Nothing is throwaway.

**POC Timeline:** 8–10 weeks, built incrementally one phase at a time.

---

## 3. Who I'm Working With (Critical — Read This)

**The user is Kal EL** — not "Sid". Sid is referenced in some of the business documents but is a different person. Always address and refer to the user as Kal EL.

**Kal EL is a complete beginner.** This shapes everything about how we work:

- **Explain before doing.** Before writing any code or running any command, explain what it is, why we're doing it, and what to expect. The "why" matters as much as the "what".
- **Never assume prior knowledge.** Terms like "ORM", "monorepo", "Docker", "JWT", "MCP" — all of these need a plain English explanation the first time they appear.
- **Teach as we go.** Every step is a learning opportunity. A beginner who understands what they built is far better off than one who copy-pasted working code they can't explain.
- **Prefer simple over clever.** If there are two ways to do something, choose the one that's easier to understand, even if the other is slightly more elegant.
- **One thing at a time.** Confirm each step works before moving to the next. Never skip ahead.

---

## 4. Session Startup Routine (Run Every New Conversation)

At the very start of each new session, **before anything else**:

1. Search the web for the latest Claude Code updates and new Anthropic features (use WebSearch with a query like "Claude Code latest updates" or "Anthropic new features [current month year]").
2. Give Kal EL a brief, plain-English summary of anything new or noteworthy.
3. Read `PROGRESS.md` to get up to speed on where we left off.
4. Then proceed with whatever task is at hand.

This keeps us current and ensures we're always using the best available tools and practices.

---

## 5. Tech Stack (Locked In — Do Not Deviate Without Discussion)

These decisions come from `poc-plan.md` and are final for the POC phase.

| Layer | Tool | Notes |
|-------|------|-------|
| **Runtime** | Node.js 20 LTS | MCP SDK is Node-native |
| **Language** | TypeScript | Type safety across all packages |
| **API Framework** | Fastify | Faster than Express, built-in validation, TypeScript-first |
| **Database** | PostgreSQL 16 (via Docker) | Best open-source relational DB |
| **ORM / Migrations** | Drizzle ORM | Type-safe, SQL-like syntax, lightweight |
| **Queue** | Redis 7 + BullMQ (via Docker) | Job queue for event-driven processing |
| **AI Protocol** | MCP SDK (`@modelcontextprotocol/sdk`) | Official MCP SDK, MIT license |
| **AI Model (POC)** | Ollama + Llama 3.1 8B or Mistral 7B | Chosen based on Kal EL's machine RAM — decide before starting agents phase |
| **Frontend** | React 19 + TypeScript + Vite | |
| **UI** | shadcn/ui + Tailwind CSS | Production-quality components, no runtime dependency |
| **State Management** | TanStack Query | Server state, auto-refetch |
| **Real-time** | Socket.io | WebSocket with fallback for dashboard updates |
| **Monorepo** | pnpm workspaces | Fast, disk-efficient |
| **Containerisation** | Docker + Docker Compose | One command to run everything |
| **Linting** | Biome | Replaces ESLint + Prettier, much faster |
| **Testing** | Vitest + Supertest | Vite-native, fast |

**LLM model selection:** If Kal EL's machine has 16GB+ RAM → use Llama 3.1 8B. If 8GB RAM → use Mistral 7B. Ask before starting the agents phase if we don't know.

---

## 6. Working Rules

These rules apply in every session, no exceptions:

1. **Explain before doing.** Always describe what we're about to do and why, in plain English, before writing code or running commands.
2. **Never commit code** unless Kal EL explicitly asks. Do not auto-commit anything.
3. **Never push to any remote** unless Kal EL explicitly asks.
4. **Check in before large changes.** If something would touch many files or change the architecture, pause and confirm first.
5. **Build incrementally.** One piece at a time. Confirm it works before moving on. Never skip steps.
6. **Keep code simple.** No over-engineering. No premature abstractions. No clever tricks. Write code that a beginner can read and understand.
7. **No assumptions about existing code.** This project starts fresh. There is no existing codebase.
8. **Update PROGRESS.md after every completed task.** Do not wait until the end of the session. The moment a task or step is finished, update PROGRESS.md immediately. This ensures progress is never lost if the session ends unexpectedly. **Always tell Kal EL when PROGRESS.md has been updated** — say what was marked complete so he can see the progress.

---

## 7. Project Structure (Target — Not Yet Built)

This is the monorepo layout we're working toward. Nothing exists yet — we build it phase by phase.

```
artisan-furniture/
├── docker-compose.yml          # PostgreSQL, Redis, Ollama
├── package.json                # pnpm workspace root
├── pnpm-workspace.yaml
├── .env.example
│
├── packages/
│   ├── db/                     # Database package
│   │   ├── src/
│   │   │   ├── schema.ts       # Drizzle schema (all 10 tables)
│   │   │   ├── enums.ts        # Status enums
│   │   │   ├── migrate.ts      # Migration runner
│   │   │   └── seed.ts         # Test data seeder
│   │   └── drizzle/            # Generated SQL migrations
│   │
│   ├── api/                    # Fastify API server
│   │   └── src/
│   │       ├── server.ts
│   │       ├── routes/         # orders, production, logistics, customers, payments, agent
│   │       ├── services/       # Business logic (shared with MCP)
│   │       ├── mcp/            # MCP server + tools + resources
│   │       ├── queue/          # BullMQ queues and workers
│   │       ├── ws/             # Socket.io
│   │       └── auth/           # JWT auth
│   │
│   ├── agents/                 # AI agent package
│   │   └── src/
│   │       ├── providers/      # LLM abstraction (Ollama, Anthropic)
│   │       ├── agents/         # order.agent.ts, supervisor.agent.ts
│   │       └── prompts/        # System prompts per agent
│   │
│   └── dashboard/              # React frontend
│       └── src/
│           ├── pages/          # OrdersPage, ProductionPage, AgentControlPage
│           ├── components/     # OrderTable, KanbanBoard, EscalationCard, etc.
│           └── hooks/          # useOrders, useProduction, useSocket
│
└── scripts/
    ├── setup.sh                # One-command setup
    └── demo.sh                 # Demo scenario runner
```

---

## 8. POC Build Phases (Sequence)

We build in this order — each phase has a clear milestone before moving on:

| Phase | What We Build | Milestone |
|-------|--------------|-----------|
| **Phase 1** | Monorepo + Docker + Database schema + Seed data | `docker compose up` gives a populated database |
| **Phase 2** | Fastify API + MCP server + Swagger docs + JWT auth | Create/read/update orders via REST and MCP tools |
| **Phase 3** | BullMQ queues + workers + Socket.io | Creating an order triggers automatic production task creation |
| **Phase 4** | React dashboard (Orders, Production Kanban, Agent Control) | Full visual management of orders and agent actions |
| **Phase 5** | AI agents (Order Agent + Supervisor skeleton) | Order Agent auto-processes new orders, escalates edge cases |
| **Phase 6** | Integration + end-to-end demo scenario | One-command demo showing the full POC |

---

## 9. Key Reference Files

- **Business plan:** `Artisan-Furniture-Business-Plan.pdf` — full business context
- **Product plan:** `product-plan.md` — full technical roadmap (production-grade vision)
- **POC plan:** `poc-plan.md` — what we're actually building now (free, local, complete)

When in doubt about scope, refer to `poc-plan.md`. When in doubt about the business, refer to the PDF.

---

## 10. Things to Decide Before Agents Phase

Before Phase 5, confirm with Kal EL:
- Machine RAM (determines Llama 3.1 8B vs Mistral 7B)
- Mac or Windows/Linux (affects Ollama install and Docker setup)
- Whether to set up a GitHub repo or keep local for POC
