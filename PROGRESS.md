# PROGRESS.md — Artisan Furniture Co.

This file is updated by Claude after every completed task. It is read at the start of every session to resume exactly where we left off.

---

## Current Status

**Active Phase:** Phase 6 — Integration + End-to-End Demo (Complete)
**Last Updated:** 2026-03-17
**Next Action:** POC complete! Ready for production planning.

---

## Completed Tasks

### Phase 1 — Foundation
- [x] Monorepo setup (pnpm workspaces, root package.json, tsconfig.json)
- [x] Docker Compose (PostgreSQL 16, Redis 7, Ollama)
- [x] Database package (`@artisan/db`) with Drizzle ORM
- [x] Schema: all 10 tables (customers, orders, order_items, artisans, production_tasks, shipments, payments, events, agent_actions, notifications)
- [x] Enums: 9 status types (order_status, production_status, shipment_status, etc.)
- [x] Migration generated and applied to PostgreSQL
- [x] Seed data: 3 customers, 5 artisans, 8 orders (across all lifecycle stages), 12 order items, 8 production tasks, 3 shipments, 6 payments, 5 events, 4 agent actions, 4 notifications
- [x] Docker containers running and verified
- [x] **Milestone achieved:** `docker compose up` + `pnpm db:seed` gives a fully populated database

### Phase 2 — API + MCP (In Progress)
- [x] Step 1: Created `@artisan/api` package (Fastify server, Typebox for validation)
  - Fastify server running on port 3000 with auto-reload (`tsx watch`)
  - `/health` endpoint verified
  - `/api/test-db` confirms API ↔ database connection works
  - Added `exports` field to `@artisan/db` package.json for monorepo imports
  - Root script: `pnpm dev:api`
- [x] Step 2: Service layer (order.service.ts — createOrder, listOrders, getOrderById, updateOrderStatus)
  - Vitest + Supertest testing set up — 7 tests passing
  - Run tests with `pnpm test` from root
- [x] Step 3: REST routes + services for all 6 domains
  - Orders: POST/GET/GET:id/PATCH:status (service + routes + Typebox validation)
  - Customers: GET/GET:id (read-only for POC)
  - Production: GET/GET:id/PATCH:status (auto-sets startedAt/completedAt)
  - Logistics: GET/GET:id/POST/PATCH:status (auto-sets actualArrival on delivery)
  - Payments: GET/GET:by-order/POST (record-keeping only, no real processing)
  - Agent: GET/GET:pending/POST/PATCH:review (human-in-the-loop approval)
  - 29 tests passing across 6 test files
- [x] Step 4: Swagger docs at http://localhost:3000/docs
  - @fastify/swagger + @fastify/swagger-ui
  - 6 tag groups: Orders, Customers, Production, Logistics, Payments, Agent
  - 16 paths auto-documented from Typebox schemas
- [x] Step 5: JWT auth with @fastify/jwt
  - POST /api/auth/login — returns JWT token (24h expiry)
  - Single admin user (credentials in .env)
  - All routes protected except /health, /docs, /api/auth/login
  - Swagger UI has "Authorize" button for testing with tokens
- [x] Step 6: MCP server with @modelcontextprotocol/sdk
  - 14 MCP tools: create_order, get_order, list_orders, update_order_status, confirm_order, list_customers, get_customer, get_production_dashboard, update_production_status, create_shipment, update_shipment_status, escalate_to_human, log_agent_action, get_pending_escalations
  - 4 MCP resources: orders://active, production://overview, escalations://pending, metrics://snapshot
  - Stdio transport — run with `pnpm mcp`
  - Tools call the same service layer as REST routes (shared logic)
- [x] Step 7: End-to-end testing (Option B — thorough)
  - 8 route test files + 1 MCP test file added
  - Auth: 8 tests (login, invalid creds, public/protected routes, token validation)
  - Orders: 7 tests, Customers: 3 tests, Production: 4 tests
  - Logistics: 4 tests, Payments: 4 tests, Agent: 5 tests
  - MCP: 11 tests (14 tools listed, tool calls verified, 4 resources read)
  - **75 total tests passing across 14 test files**
  - **Phase 2 milestone achieved:** Create/read/update orders via both REST API and MCP tools

### Phase 3 — Event Queue
- [x] Step 1: Installed BullMQ v5.70.4 and Socket.io v4.8.3
- [x] Step 2: Queue definitions (`queue/queues.ts`)
  - 3 queues: `business-events`, `agent-tasks`, `notifications`
  - Redis connection from `REDIS_URL` in .env
  - Helper functions: `emitBusinessEvent()`, `queueAgentTask()`, `sendNotification()`
- [x] Step 3: Socket.io setup (`ws/socket.ts`)
  - Real-time server attached to Fastify's HTTP server
  - CORS configured for React dashboard (port 5173)
  - `getIO()` helper for pushing events from workers
- [x] Step 4: Workers (`queue/workers.ts`)
  - Business Event Worker: handles `order.created`, `order.confirmed`, `production.completed`, `shipment.created`
  - Agent Task Worker: placeholder for Phase 5 (logs tasks)
  - Notification Worker: logs to console + pushes via Socket.io
- [x] Step 5: Service layer wired to emit events
  - `createOrder()` → emits `order.created` (dashboard notification)
  - `updateOrderStatus(confirmed)` → emits `order.confirmed` (triggers production task creation)
  - `updateProductionStatus(approved)` → checks all tasks, emits `production.completed` when all done
  - `createShipment()` → emits `shipment.created`
- [x] Step 6: Server wiring — workers start on boot, graceful shutdown on SIGINT/SIGTERM
- [x] Step 7: End-to-end testing (manual)
  - Confirmed: creating order → adding items → confirming → production tasks auto-created
  - Confirmed: order.confirmed → agent task queued → agent worker received
  - Confirmed: production.completed → shipment auto-created
- [x] Step 8: Automated tests
  - Queue tests: 5 tests (queue names, emitBusinessEvent, queueAgentTask, sendNotification)
  - Worker integration tests: 3 tests (order.confirmed creates tasks, empty order skips, production.completed creates shipment)
  - **83 total tests passing across 16 test files**
  - **Phase 3 milestone achieved:** Confirming an order triggers automatic production task creation

### Phase 4 — React Dashboard
- [x] Step 1: Scaffolded `@artisan/dashboard` package
  - Vite 8 + React 19 + TypeScript
  - Tailwind CSS v4 with Vite plugin
  - Vite proxy: `/api` requests forwarded to `localhost:3000`
  - Root script: `pnpm dev:dashboard`
- [x] Step 2: Routing and app layout
  - React Router with 3 routes: `/` (Orders), `/production`, `/agent`
  - Sidebar layout: dark sidebar with nav links, header bar, main content area
  - Active page highlighting, page transition animations
- [x] Step 3: API client + TanStack Query
  - `lib/api.ts` — GET/POST/PATCH helpers with JWT token management
  - `LoginForm.tsx` — auth gate shown before dashboard
  - TanStack Query wired with QueryClient (caching, auto-refetch)
  - 3 custom hook files: `useOrders.ts`, `useProduction.ts`, `useAgent.ts`
- [x] Step 4: Orders Page
  - Table with all orders, status badges (color-coded per status)
  - Filter dropdown by status
  - Click row to expand: customer info + order items list
  - Quick action buttons to advance order to next status
  - `StatusBadge` component shared across all pages
- [x] Step 5: Production Kanban Board
  - 6 columns: Pending, Assigned, In Progress, Quality Check, Approved, Rejected
  - Color-coded column headers with task count badges
  - Task cards: product type, artisan name/location, status badge
  - Click to expand: material, description, dates, workshop
  - Advance button to move tasks to next stage
- [x] Step 6: Agent Control Page
  - Pending Escalations section with yellow-bordered cards
  - Approve/Reject buttons with optional review notes
  - Confidence bar (color-coded: green >80%, yellow >50%, red <50%)
  - Agent output data display
  - Recent Activity feed table (agent type, action, order, confidence, status, review)
- [x] Step 7: Socket.io real-time integration
  - `useSocket` hook connects to API server's Socket.io
  - Incoming events invalidate TanStack Query caches (auto-refetch)
  - Toast notification system: `lib/toast.ts` + `ToastContainer.tsx`
  - Toasts slide in from right, auto-dismiss after 5 seconds
- [x] Step 8: Polish
  - Improved login screen (dark background, rounded card, subtle animations)
  - Header bar showing current page name
  - Fade-in page transitions, custom scrollbar styling
  - Green status indicator in sidebar footer
  - **Phase 4 milestone achieved:** Full visual management of orders and agent actions

### Phase 5 — AI Agents (In Progress)
- [x] Step 1: Ollama + Llama 3.1 8B running in Docker
  - Docker Desktop memory increased to 10 GB (was ~8 GB)
  - Model downloaded (4.9 GB) and verified working
  - API endpoint: `http://localhost:11434/api/chat`
- [x] Step 2: Created `@artisan/agents` package
  - Folder structure: `src/providers/`, `src/agents/`, `src/prompts/`
  - Added `LLM_PROVIDER=ollama` and `LLM_MODEL=llama3.1` to `.env`
  - Root scripts: `pnpm dev:agents`, `pnpm test:agents`
  - pnpm workspace now has 5 packages (db, api, dashboard, agents + root)
- [x] Step 3: LLM provider abstraction
  - `providers/llm.ts` — interface (Message, Tool, ToolCall, LLMResponse, LLMProvider) + factory function
  - `providers/ollama.ts` — Ollama implementation (talks to localhost:11434/api/chat)
  - Supports: simple chat, tool calling, conversation history
  - Provider swap via `LLM_PROVIDER` env var (only "ollama" for now, "anthropic" slot ready)
  - 3 tests passing (provider creation, simple chat, tool calling with Llama 3.1)
- [x] Step 4: System prompts for Order Agent and Supervisor Agent
  - `prompts/order.prompt.ts` — 5-step workflow: gather info → validate → suggest artisan → estimate timeline → confirm or escalate
  - Auto-confirm rules: all fields present, under $10k, artisan matched, no special requests
  - Escalation triggers: $10k+, missing fields, no artisan match, rush/custom requests, low confidence
  - Artisan matching by specialty (wood, upholstery, metal, stone, mixed)
  - `prompts/supervisor.prompt.ts` — daily summary: orders, production pipeline, escalations, agent activity, recommendations
  - Prompt patterns inspired by agency-agents repo (orchestrator, project shepherd, executive summary generator)
- [x] Step 5: Order Agent — test passing + wired to queue
  - `agents/order.agent.ts` — full agent loop: sends task to LLM → LLM calls tools → execute tools → send results back → repeat
  - `agents/tool-helpers.ts` — thin DB wrapper for `logAgentAction` (avoids circular dependency with API package)
  - 9 tools available: get_order, list_orders, get_customer, list_customers, get_production_dashboard, list_artisans, confirm_order, log_agent_action, escalate_to_human
  - Agent loop has MAX_ROUNDS=10 safety limit to prevent infinite loops
  - Decision logic: checks which tools were called (confirm_order vs escalate_to_human) to determine outcome
  - `ollama.ts` — added AbortController with 5-min timeout (env var `LLM_TIMEOUT_MS`, default 300s)
  - `vitest.config.ts` — fileParallelism disabled + 10-min global test timeout
  - Test has Ollama health check in `beforeAll` — skips gracefully if Ollama is down
  - **Test passing:** agent fetches order, validates, and makes a decision (confirmed or escalated)
  - **Wired to BullMQ:** `@artisan/agents` added as dependency to `@artisan/api`
  - Agent worker in `workers.ts` replaced placeholder with real logic: calls `processOrder()`, logs result, sends dashboard notification, emits `agent:result` via Socket.io
  - `agents/package.json` — added exports field for cross-package imports
  - `seed.ts` — fixed to use `TRUNCATE ... RESTART IDENTITY CASCADE` (IDs now reset properly on re-seed)
  - `workers.test.ts` — fixed afterAll hook timeout (force-close workers to avoid LLM hang)
  - **4 agent tests passing + 83 API tests passing = 87 total tests across 18 files**
  - `PRODUCTION-NOTES.md` created — tracks upgrade paths (Ollama → Claude API, Agent SDK evaluation, prompt references)
  - Added to CLAUDE.md Section 9 as a key reference file
- [x] Step 6: Supervisor Agent skeleton — test passing
  - `agents/supervisor.agent.ts` — same agent loop pattern as Order Agent, 4 tools (list_orders, get_production_dashboard, get_pending_escalations, log_agent_action)
  - `generateSummary(llm)` — generates structured daily operations summary
  - Defensive JSON parsing for `log_agent_action` (local LLM doesn't always format args as valid JSON)
  - Production dashboard includes artisan workload (tasks per artisan)
  - MAX_ROUNDS=8 (supervisor finishes faster than order agent)
  - Test: LLM called all 4 tools, generated properly formatted summary with real data from seed DB
  - Exported from `@artisan/agents`: `generateSummary()` + `SupervisorAgentResult` type
  - **5 agent tests + 83 API tests = 88 total tests across 19 files**
- [x] Step 7: Supervisor Agent wired to BullMQ + dashboard
  - `POST /api/agent/summary` — API endpoint that queues a `generate-summary` task
  - Agent worker handles `generate-summary` task type: calls `generateSummary(llm)`, logs result, sends notification, emits `agent:summary` via Socket.io
  - Dashboard: "Generate Summary" button on Agent Control page
  - Real-time: summary appears automatically when LLM finishes (via Socket.io `agent:summary` event)
  - Toast notification when summary completes
  - `useGenerateSummary` hook in dashboard
  - Socket.io listener in `useSocket.ts` for `agent:summary` event
  - **Phase 5 milestone achieved:** Order Agent auto-processes orders + Supervisor generates daily summaries on demand

### Phase 6 — Integration + End-to-End Demo
- [x] Step 1: `scripts/setup.sh` — one-command setup
  - Checks prerequisites (Node, pnpm, Docker)
  - Copies .env.example, installs deps, starts Docker
  - Waits for PostgreSQL/Redis/Ollama health checks
  - Runs migrations, seeds data, pulls LLM model
- [x] Step 2: `scripts/demo.sh` — end-to-end demo script
  - Interactive walkthrough of full order lifecycle via curl API calls
  - Authenticates → creates order → adds items → confirms → production → QC → shipment → supervisor summary
  - Color-coded output, pause between steps, auto-detects if API is running
- [x] Step 3: `README.md` — project documentation
  - Quick start guide, architecture overview, tech stack, URLs, scripts reference
- [x] Step 4: `POST /api/orders/:id/items` endpoint
  - New route + service function for adding items to an order (needed by demo script)
  - `addOrderItem()` in order.service.ts
- [x] All 83 API tests + 5 agent tests still passing (88 total across 19 files)
- [x] **Phase 6 milestone achieved:** One-command setup + demo showing the full POC

---

## Open Decisions / Questions

- [x] Machine RAM: **16GB** → using **Llama 3.1 8B** for AI agents
- [x] Platform: **macOS (Apple Silicon)**
- [x] GitHub repo: **https://github.com/kal-el-1995/artisan-furniture** (private)

---

## Phase Checklist

- [x] **Phase 1** — Monorepo + Docker + Database schema + Seed data
- [x] **Phase 2** — Fastify API + MCP server + Swagger + JWT auth
- [x] **Phase 3** — BullMQ queues + workers + Socket.io
- [x] **Phase 4** — React dashboard
- [x] **Phase 5** — AI agents
- [x] **Phase 6** — Integration + end-to-end demo

---

## Notes

- Session setup (CLAUDE.md, PROGRESS.md) completed on 2026-03-09
- Fixed: removed `.js` extensions from imports (drizzle-kit CJS compatibility)
- Fixed: dotenv path resolution to load `.env` from monorepo root
- Fixed: added missing `CREATE TYPE` enum statements to migration SQL
- Docker installed: Docker v29.2.1, Docker Compose v5.0.2
- Phase 2 started: 2026-03-10
- Chose Typebox over Zod for Fastify validation (native integration, zero adapter needed)
- Phase 3 completed: 2026-03-11
- Design decision: production tasks created on `order.confirmed` (not `order.created`) because items aren't added until after order creation
- Seed data: `seed.ts` now uses `TRUNCATE ... RESTART IDENTITY CASCADE` — IDs reset to 1 on every re-seed
- Heat management: Llama 3.1 8B on CPU in Docker is CPU-intensive. For testing, temporarily reduce `num_ctx` to 2048-4096 and add cooldown delays between LLM calls. Consider running Ollama natively (not in Docker) to use Apple GPU for faster + cooler inference.
- Phase 4 completed: 2026-03-14
- Dashboard styling is functional (Tailwind utilities) — shadcn/ui full setup deferred, can be added later for more polish
- Dashboard runs on port 5173, API on port 3000 — Vite proxy handles `/api` forwarding
- GitHub repo created: 2026-03-16 — https://github.com/kal-el-1995/artisan-furniture
- Git safe.directory configured for `/Users/vishnuclaude/Projects Claude Code/Artisan Furniture`
- Cleared stale gh credential helpers; using osxkeychain for GitHub auth
- Phase 5 started: 2026-03-16
- Docker Desktop memory: increased to 10 GB to fit Llama 3.1 8B (4.8 GB model + overhead)
