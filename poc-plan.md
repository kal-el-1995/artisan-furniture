# POC Plan: Artisan Furniture Platform (Free & Open Source)

## 1. POC Objective

Build a slim, fully functional version of the Artisan Furniture Platform using only free and open-source tools. The POC proves that the MCP-native architecture works end-to-end: a customer order flows through production tracking, shipment, and delivery — managed by AI agents operating through MCP tools, with a human dashboard for oversight.

**Target:** Everything runs locally on your machine. Zero hosting cost. Zero API fees.

**Timeline:** 8–10 weeks (single developer)


## 2. POC Scope — What's In, What's Out

### In Scope (Slim MVP)
- Full database schema (all tables)
- Core REST API (orders, production, logistics, customers, agent actions)
- MCP server with tools, resources, and prompts
- Basic admin dashboard (order management, production kanban, agent control center)
- Event queue with workers
- One fully functional AI agent (Order Agent) + Supervisor Agent skeleton
- Seed data simulating real orders through the full lifecycle
- Everything runs locally via Docker Compose

### Out of Scope (Deferred to Production)
- Customer-facing portal (admin-only for POC)
- Real payment processing (mock payments only)
- Real shipping/customs integration (simulated)
- Email/SMS notifications (console logging only)
- Production-grade auth (basic JWT, no OAuth)
- Multi-user / role-based access (single admin user)
- Photo uploads from artisans (text-based status updates only)
- Deployment / CI/CD pipeline


## 3. Technology Stack — 100% Free & Open Source

### 3.1 Complete Stack

| Layer | Tool | License | Why This |
|-------|------|---------|----------|
| **Runtime** | Node.js 20 LTS | MIT | Industry standard, MCP SDK is Node-native |
| **Framework** | Fastify | MIT | Faster than Express, built-in validation, TypeScript-first |
| **Language** | TypeScript | Apache 2.0 | Type safety across frontend + backend + MCP |
| **Database** | PostgreSQL 16 | PostgreSQL License (OSI) | Best open-source relational DB, JSON support |
| **DB Migrations** | Drizzle ORM | Apache 2.0 | Type-safe, lightweight, great DX, SQL-like syntax |
| **Queue** | BullMQ + Redis 7 | MIT | Proven job queue, runs locally |
| **MCP** | @modelcontextprotocol/sdk | MIT | Official MCP SDK |
| **LLM (AI Agents)** | Ollama + Llama 3.1 8B | MIT / Meta Community License | Free local inference, no API costs |
| **LLM Alternative** | Ollama + Mistral 7B | Apache 2.0 | Lighter option if Llama is too heavy |
| **Frontend** | React 19 + TypeScript | MIT | Already in original plan |
| **Build Tool** | Vite | MIT | Fast, zero-config |
| **UI Library** | shadcn/ui + Tailwind CSS | MIT | Pre-built components, no runtime dependency |
| **State Management** | TanStack Query | MIT | Server state caching, auto-refetch |
| **Routing** | React Router 7 | MIT | Standard routing |
| **Real-time** | Socket.io | MIT | WebSocket with fallback, simple API |
| **API Docs** | Swagger/OpenAPI via @fastify/swagger | MIT | Auto-generated from route schemas |
| **Testing** | Vitest + Supertest | MIT | Fast, Vite-native testing |
| **Containerization** | Docker + Docker Compose | Apache 2.0 | One command to run everything |
| **Monorepo** | pnpm workspaces | MIT | Fast, disk-efficient, built-in workspace support |
| **Linting** | Biome | MIT | Replaces ESLint + Prettier, 100x faster |

### 3.2 What About the LLM?

This is the critical POC decision. Here are the free options ranked:

**Option A: Ollama + Llama 3.1 8B (Recommended)**
- Runs fully locally, no internet needed
- 8B parameter model fits in 8GB RAM (quantized)
- Good enough for tool-calling and structured JSON output
- Install: `brew install ollama && ollama pull llama3.1`
- Cost: $0

**Option B: Ollama + Mistral 7B**
- Slightly lighter than Llama 3.1
- Strong at structured tasks and function calling
- Good fallback if your machine has less RAM
- Cost: $0

**Option C: Claude API free credits (if available)**
- Anthropic sometimes offers free API credits for developers
- Best quality but not guaranteed free
- Use as stretch goal once POC works with Ollama

**Option D: OpenRouter free tier**
- Aggregator with some free model access
- Requires internet but no payment
- Good for testing multiple models

**For the POC, build the agent layer with a provider abstraction** so you can swap between Ollama (local) and any API provider (Claude, OpenAI) with a single env variable. This is the smart long-term move anyway.

### 3.3 Architecture Diagram (POC)

```
┌─────────────────────────────────────────────────┐
│              Docker Compose Network               │
│                                                   │
│  ┌─────────────┐     ┌─────────────────────────┐ │
│  │  React SPA  │────▶│  Fastify API Server     │ │
│  │  (Vite dev) │     │  ┌───────────────────┐  │ │
│  │  Port 5173  │◀────│  │   MCP Server      │  │ │
│  └─────────────┘     │  │   (embedded)      │  │ │
│                      │  └───────────────────┘  │ │
│                      │  Port 3000              │ │
│                      └──────┬──────────────────┘ │
│                             │                     │
│               ┌─────────────┼──────────────┐      │
│               ▼             ▼              ▼      │
│         ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│         │PostgreSQL│ │  Redis   │ │  Ollama    │ │
│         │ Port 5432│ │ Port 6379│ │  Port 11434│ │
│         └──────────┘ └──────────┘ └────────────┘ │
│                             │                     │
│                             ▼                     │
│                    ┌─────────────────┐            │
│                    │  BullMQ Workers │            │
│                    │  + AI Agents    │            │
│                    └─────────────────┘            │
└─────────────────────────────────────────────────┘
```


## 4. Database Schema (Same as Full Plan)

The database schema is identical to the full product plan — all 10 tables. There's no reason to simplify the schema for POC since it's just SQL migrations. Having the full schema lets you test realistic data flows.

One POC addition:

**seed data** — a script that populates the database with realistic test scenarios:
- 3 customers with different order types
- 5 artisans with different specialties
- 8 orders in various lifecycle stages (draft through delivered)
- Production tasks, shipments, payments at different statuses
- Sample agent actions (some pending approval, some executed)

This gives you a working system to demo immediately.


## 5. Core API (Slim but Complete)

### 5.1 POC API Scope

All endpoints from the full plan, but with these simplifications:

- **Auth:** Single admin user, hardcoded JWT secret, no registration flow
- **Payments:** Record-keeping only — no Stripe/Square integration. `POST /payments` just creates a record.
- **Notifications:** Log to console + store in DB. No email/SMS delivery.
- **File uploads:** Skip photo uploads. Production updates are text + status only.

### 5.2 API Framework: Fastify

Why Fastify over Express for POC:

```typescript
// Fastify gives you validation + serialization + swagger for free
app.post('/orders', {
  schema: {
    body: CreateOrderSchema,      // auto-validates input
    response: { 201: OrderSchema } // auto-serializes output
  }
}, async (request, reply) => {
  const order = await createOrder(request.body);
  return reply.code(201).send(order);
});
// → Swagger docs auto-generated at /docs
// → Invalid requests rejected before your handler runs
// → Response shape guaranteed
```

### 5.3 Drizzle ORM

Why Drizzle over Prisma for this project:

```typescript
// Schema definition (type-safe, SQL-like)
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id),
  status: orderStatusEnum('status').default('draft'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
  showroomNotes: text('showroom_notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Queries read like SQL — no magic, no hidden behavior
const activeOrders = await db
  .select()
  .from(orders)
  .where(eq(orders.status, 'in_production'))
  .orderBy(desc(orders.createdAt));
```

Benefits: SQL-in-TypeScript (no new query language), lightweight (no engine process like Prisma), migrations are plain SQL files.


## 6. MCP Server Implementation

### 6.1 Approach: Embedded MCP Server

The MCP server runs inside the Fastify process (not as a separate service). This keeps the POC simple — one process serves both the REST API and MCP tools.

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'artisan-furniture',
  version: '0.1.0',
});

// Each API operation becomes an MCP tool
server.tool('create_order', CreateOrderSchema, async (params) => {
  // Same logic as REST endpoint — shared service layer
  const order = await orderService.create(params);
  return { content: [{ type: 'text', text: JSON.stringify(order) }] };
});

server.tool('get_active_orders', {}, async () => {
  const orders = await orderService.getActive();
  return { content: [{ type: 'text', text: JSON.stringify(orders) }] };
});

server.tool('escalate_to_human', EscalationSchema, async (params) => {
  const ticket = await escalationService.create(params);
  return { content: [{ type: 'text', text: JSON.stringify(ticket) }] };
});
```

### 6.2 POC MCP Tools

Priority tools for POC (covers the critical path):

```
Orders:       create_order, get_order, list_orders, update_order_status, confirm_order
Production:   create_production_task, update_production_status, get_production_dashboard
Logistics:    create_shipment, update_shipment_status
Customers:    get_customer, list_customers
Agent:        escalate_to_human, log_agent_action, get_pending_escalations
```

### 6.3 POC MCP Resources

```
orders://active        → JSON array of all non-completed orders
production://overview  → summary of production pipeline
escalations://pending  → items awaiting human review
metrics://snapshot     → order counts, revenue, agent activity
```


## 7. Human Dashboard (POC Version)

### 7.1 POC Dashboard Scope

Three views only (covers the critical workflow):

**1. Orders View**
- Table of all orders with status badges
- Click to expand: order items, timeline, payments
- Quick actions: confirm order, update status
- Filter by status

**2. Production Board**
- Simple Kanban: Pending → In Progress → Quality Check → Done
- Cards show: order item, artisan, dates
- Click card to update status

**3. Agent Control Center**
- Pending approvals list (the key human-in-the-loop UI)
- Each item shows: what agent proposed, why, confidence level
- Approve / reject buttons with optional notes
- Recent agent activity feed

### 7.2 Component Library

Using shadcn/ui means you get production-quality components for free:

```
Table, Card, Badge, Button, Dialog, Select, Tabs,
Kanban (custom but using shadcn primitives),
Toast (for real-time agent notifications)
```

### 7.3 Real-Time Updates

Socket.io pushes events from BullMQ workers to the dashboard:
- New order → toast notification
- Agent action pending → badge count on Agent tab
- Production status change → Kanban card moves


## 8. Event Queue (POC Version)

### 8.1 Simplified Queue Structure

Three queues instead of six (combine related events):

```
Queues:
├── business-events    — all order/production/logistics events
├── agent-tasks        — work items for AI agents
└── notifications      — dashboard updates (console log for POC)
```

### 8.2 Key Workers

```typescript
// Business event worker
businessEventWorker.process(async (job) => {
  switch (job.data.type) {
    case 'order.created':
      await createProductionTasks(job.data.orderId);
      await notifyDashboard('new_order', job.data);
      break;
    case 'order.confirmed':
      await queueAgentTask('assign_artisans', job.data);
      break;
    case 'production.completed':
      await createShipment(job.data.orderId);
      break;
  }
});

// Agent task worker
agentTaskWorker.process(async (job) => {
  const result = await orderAgent.execute(job.data);
  if (result.needsHumanApproval) {
    await escalationService.create(result);
    await notifyDashboard('escalation', result);
  }
});
```


## 9. AI Agent Design (POC Version)

### 9.1 LLM Provider Abstraction

Build a simple abstraction so agents work with any LLM:

```typescript
// providers/llm.ts
interface LLMProvider {
  chat(messages: Message[], tools?: Tool[]): Promise<LLMResponse>;
}

class OllamaProvider implements LLMProvider {
  async chat(messages, tools) {
    // POST http://localhost:11434/api/chat
    // Ollama supports tool/function calling with compatible models
  }
}

class AnthropicProvider implements LLMProvider {
  async chat(messages, tools) {
    // Uses Claude API — swap in later for production
  }
}

// Factory
function createLLM(): LLMProvider {
  switch (process.env.LLM_PROVIDER) {
    case 'ollama': return new OllamaProvider();
    case 'anthropic': return new AnthropicProvider();
    default: return new OllamaProvider(); // free default
  }
}
```

### 9.2 POC Agents

**Order Agent (fully built)**
- Listens for `order.created` events
- Validates order completeness (are all required fields filled?)
- Suggests artisan assignments based on specialties matching order items
- Estimates production timeline
- Auto-acts on straightforward orders, escalates ambiguous ones
- Uses MCP tools to read/write data

**Supervisor Agent (skeleton)**
- Generates daily summary of all activity
- Monitors Order Agent actions
- Proves the multi-agent orchestration pattern works
- Minimal logic — mostly logging and reporting

### 9.3 Agent-MCP Integration

The agent connects to the MCP server as a client:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

class OrderAgent {
  private llm: LLMProvider;
  private mcpClient: Client;

  async execute(task: AgentTask) {
    // 1. Gather context via MCP resources
    const activeOrders = await this.mcpClient.readResource('orders://active');

    // 2. Ask LLM for decision
    const response = await this.llm.chat([
      { role: 'system', content: ORDER_AGENT_PROMPT },
      { role: 'user', content: JSON.stringify(task) },
      { role: 'user', content: `Current orders: ${activeOrders}` }
    ], this.getAvailableTools());

    // 3. Execute tool calls from LLM response
    for (const toolCall of response.toolCalls) {
      const result = await this.mcpClient.callTool(toolCall.name, toolCall.args);
      await this.logAction(toolCall, result);
    }

    // 4. Check if escalation needed
    if (response.confidence < ESCALATION_THRESHOLD) {
      return { needsHumanApproval: true, ...response };
    }

    return { needsHumanApproval: false, ...response };
  }
}
```


## 10. Project Structure

```
artisan-furniture/
├── docker-compose.yml          # PostgreSQL, Redis, Ollama
├── package.json                # pnpm workspace root
├── pnpm-workspace.yaml
├── .env.example                # LLM_PROVIDER=ollama, DB creds, etc.
│
├── packages/
│   ├── db/                     # Database package
│   │   ├── src/
│   │   │   ├── schema.ts       # Drizzle schema (all tables)
│   │   │   ├── enums.ts        # Status enums
│   │   │   ├── migrate.ts      # Migration runner
│   │   │   └── seed.ts         # Test data seeder
│   │   ├── drizzle/            # Generated SQL migrations
│   │   └── package.json
│   │
│   ├── api/                    # Fastify API server
│   │   ├── src/
│   │   │   ├── server.ts       # Fastify app setup
│   │   │   ├── routes/
│   │   │   │   ├── orders.ts
│   │   │   │   ├── production.ts
│   │   │   │   ├── logistics.ts
│   │   │   │   ├── customers.ts
│   │   │   │   ├── payments.ts
│   │   │   │   └── agent.ts
│   │   │   ├── services/       # Business logic (shared with MCP)
│   │   │   │   ├── order.service.ts
│   │   │   │   ├── production.service.ts
│   │   │   │   ├── logistics.service.ts
│   │   │   │   └── escalation.service.ts
│   │   │   ├── mcp/
│   │   │   │   ├── server.ts   # MCP server setup
│   │   │   │   ├── tools.ts    # Tool definitions
│   │   │   │   └── resources.ts # Resource definitions
│   │   │   ├── queue/
│   │   │   │   ├── queues.ts   # Queue definitions
│   │   │   │   └── workers.ts  # Event workers
│   │   │   ├── ws/
│   │   │   │   └── socket.ts   # Socket.io for dashboard
│   │   │   └── auth/
│   │   │       └── jwt.ts      # Simple JWT auth
│   │   └── package.json
│   │
│   ├── agents/                 # AI agent package
│   │   ├── src/
│   │   │   ├── providers/
│   │   │   │   ├── llm.ts      # Provider abstraction
│   │   │   │   ├── ollama.ts   # Ollama implementation
│   │   │   │   └── anthropic.ts # Claude implementation (later)
│   │   │   ├── agents/
│   │   │   │   ├── order.agent.ts
│   │   │   │   └── supervisor.agent.ts
│   │   │   ├── prompts/        # System prompts per agent
│   │   │   │   ├── order.prompt.ts
│   │   │   │   └── supervisor.prompt.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── dashboard/              # React frontend
│       ├── src/
│       │   ├── App.tsx
│       │   ├── pages/
│       │   │   ├── OrdersPage.tsx
│       │   │   ├── ProductionPage.tsx
│       │   │   └── AgentControlPage.tsx
│       │   ├── components/
│       │   │   ├── OrderTable.tsx
│       │   │   ├── KanbanBoard.tsx
│       │   │   ├── EscalationCard.tsx
│       │   │   └── AgentActivityFeed.tsx
│       │   ├── hooks/
│       │   │   ├── useOrders.ts
│       │   │   ├── useProduction.ts
│       │   │   └── useSocket.ts
│       │   └── lib/
│       │       └── api.ts       # API client
│       ├── index.html
│       └── package.json
│
└── scripts/
    ├── setup.sh                # One-command setup
    └── demo.sh                 # Run demo scenario
```


## 11. Docker Compose (One Command to Run)

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: artisan_furniture
      POSTGRES_USER: artisan
      POSTGRES_PASSWORD: dev_password
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  ollama:
    image: ollama/ollama:latest
    ports:
      - '11434:11434'
    volumes:
      - ollama_models:/root/.ollama
    # After first start: docker exec ollama ollama pull llama3.1

volumes:
  pgdata:
  ollama_models:
```

**Setup flow:**
```bash
# 1. Start infrastructure
docker compose up -d

# 2. Pull the LLM model (first time only, ~4.7GB)
docker exec ollama ollama pull llama3.1

# 3. Install dependencies
pnpm install

# 4. Run migrations + seed data
pnpm --filter db migrate && pnpm --filter db seed

# 5. Start API + agents + dashboard
pnpm dev  # runs all packages concurrently
```


## 12. POC Development Timeline

### Phase 1: Foundation (Week 1)
- Set up monorepo with pnpm workspaces
- Docker Compose for PostgreSQL + Redis + Ollama
- Drizzle schema for all 10 tables
- Migrations + seed script with realistic test data
- **Milestone:** `docker compose up` + `pnpm db:seed` gives you a populated database

### Phase 2: API + MCP (Weeks 2–3)
- Fastify server with all route modules
- Service layer (shared between REST and MCP)
- MCP server with tools and resources
- Swagger docs auto-generated
- Basic JWT auth (single admin user)
- **Milestone:** Can create/read/update orders via both REST API and MCP tools

### Phase 3: Event Queue (Week 4)
- BullMQ queues and workers
- Event emission from service layer
- Socket.io for dashboard push
- Console-based notification logging
- **Milestone:** Creating an order triggers automatic production task creation

### Phase 4: Dashboard (Weeks 5–6)
- React app with shadcn/ui
- Orders table with filters and detail view
- Production Kanban board
- Agent control center (approvals, activity feed)
- Real-time updates via Socket.io
- **Milestone:** Full visual management of orders and agent actions

### Phase 5: AI Agents (Weeks 7–8)
- LLM provider abstraction (Ollama + future providers)
- Order Agent: validate orders, suggest artisan assignments, estimate timelines
- Supervisor Agent: daily summary generation
- Escalation workflow end-to-end
- **Milestone:** Order Agent auto-processes new orders, escalates edge cases

### Phase 6: Integration + Demo (Weeks 9–10)
- End-to-end testing of full order lifecycle
- Demo script that walks through a complete scenario
- Bug fixes and polish
- Documentation (README, setup guide, architecture doc)
- **Milestone:** One-command demo showing the full POC


## 13. POC Demo Scenario

The demo script simulates a complete order lifecycle:

```
1. Customer "Sarah Chen" places a custom dining table order
   → Order Agent validates, confirms completeness
   → Auto-assigns to artisan "Rajesh Kumar" (wood specialist)
   → Estimates 6-week production timeline

2. Production updates flow in over simulated time:
   → Week 1: Material sourcing complete
   → Week 3: Frame construction done
   → Week 5: Finishing and quality check
   → Production Agent flags a minor wood grain issue
   → Escalates to human → Sid approves "proceed, cosmetic only"

3. Order moves to shipping:
   → Shipment created, tracking number assigned
   → Customs declaration logged
   → Status updates: in transit → customs → cleared → delivered

4. Supervisor Agent generates daily briefing:
   → "3 orders active, 1 in quality check, 1 delivered today"
   → "Order Agent processed 5 tasks, escalated 1"
   → "No blocked items"
```

This scenario proves every layer works: database, API, MCP tools, event queue, AI agents, human dashboard, and the escalation loop.


## 14. Cost Summary

| Component | Cost |
|-----------|------|
| Node.js, TypeScript, Fastify | $0 (open source) |
| PostgreSQL | $0 (open source, local Docker) |
| Redis + BullMQ | $0 (open source, local Docker) |
| React, Vite, shadcn/ui, Tailwind | $0 (open source) |
| MCP SDK | $0 (open source, MIT) |
| Ollama + Llama 3.1 8B | $0 (open source, local) |
| Docker | $0 (Docker Desktop free for personal) |
| Drizzle ORM | $0 (open source) |
| Socket.io | $0 (open source) |
| pnpm | $0 (open source) |
| Biome (linting) | $0 (open source) |
| Vitest (testing) | $0 (open source) |
| **Total** | **$0** |

**Hardware requirement:** Machine with 16GB RAM (8GB minimum with quantized Llama 3.1). Ollama runs the LLM on CPU if no GPU available — slower but functional for POC.


## 15. POC → Production Migration Path

When the POC is validated, the path to production is straightforward because the architecture is the same:

| POC | Production | Effort |
|-----|-----------|--------|
| Local PostgreSQL | Neon / Supabase (free → paid) | Change connection string |
| Local Redis | Upstash (free tier) | Change connection string |
| Ollama (local LLM) | Claude API via Anthropic | Swap LLM_PROVIDER env var |
| Single admin JWT | Full auth with roles + OAuth | Moderate refactor |
| Console notifications | SendGrid email + Twilio SMS | Add notification providers |
| Docker Compose | Railway / Render deployment | Add Dockerfiles + deploy config |
| No file storage | Cloudflare R2 / Supabase Storage | Add upload service |
| Basic dashboard | Full dashboard with all views | Extend existing React app |
| 2 agents | 5 agents | Build on existing agent framework |

The key point: nothing in the POC is throwaway. Every line of code carries forward.


## 16. Open Questions for POC

1. **Your machine specs** — How much RAM do you have? This determines which Ollama model to use (8B vs 7B vs smaller).
2. **Mac or Windows/Linux?** — Affects Docker setup and Ollama installation.
3. **Preferred IDE** — VS Code with recommended extensions, or something else?
4. **GitHub repo** — Want to set one up now, or keep it local for POC?
