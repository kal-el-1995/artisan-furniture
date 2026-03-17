# Artisan Furniture Co.

A premium handcrafted furniture platform where furniture is made by skilled artisans in India and sold to customers in the United States. AI agents handle routine operations autonomously.

This is a **fully functional local POC** — everything runs on your machine via Docker. Zero hosting cost. Zero API fees.

## Architecture

```
Customer (Dashboard) → Fastify API → PostgreSQL
                           ↓
                    BullMQ (Redis) → Workers
                           ↓
                    AI Agents (Ollama + Llama 3.1 8B)
                           ↓
                    Socket.io → Dashboard (real-time updates)
```

**Packages:**
- `packages/db` — Database schema, migrations, seed data (Drizzle ORM)
- `packages/api` — REST API + MCP server + queues + workers (Fastify)
- `packages/agents` — AI agents: Order Agent + Supervisor Agent (Ollama)
- `packages/dashboard` — React dashboard with real-time updates (Vite)

## Quick Start

```bash
# 1. Clone and enter the project
git clone https://github.com/kal-el-1995/artisan-furniture.git
cd artisan-furniture

# 2. Run the setup script (installs deps, starts Docker, seeds DB)
./scripts/setup.sh

# 3. Start the API server (in one terminal)
pnpm dev:api

# 4. Start the dashboard (in another terminal)
pnpm dev:dashboard

# 5. Open the dashboard
open http://localhost:5173
# Login: admin / admin123
```

## Running the Demo

The demo script walks through a complete order lifecycle:

```bash
# Make sure pnpm dev:api is running in another terminal
./scripts/demo.sh
```

This demonstrates: order creation → AI agent review → production → quality check → international shipping → supervisor summary.

## URLs

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:5173 |
| API | http://localhost:3000 |
| Swagger Docs | http://localhost:3000/docs |
| MCP Server | `pnpm mcp` (stdio) |

## Scripts

| Command | What it does |
|---------|-------------|
| `pnpm dev:api` | Start the API server (port 3000) |
| `pnpm dev:dashboard` | Start the React dashboard (port 5173) |
| `pnpm test` | Run API tests (83 tests) |
| `pnpm test:agents` | Run agent tests (5 tests, requires Ollama) |
| `pnpm db:seed` | Reset and re-seed the database |
| `pnpm db:migrate` | Run database migrations |
| `pnpm mcp` | Start the MCP server (stdio transport) |

## Tech Stack

| Layer | Tool |
|-------|------|
| Runtime | Node.js 20 LTS |
| Language | TypeScript |
| API | Fastify |
| Database | PostgreSQL 16 (Docker) |
| ORM | Drizzle ORM |
| Queue | Redis 7 + BullMQ (Docker) |
| AI | Ollama + Llama 3.1 8B (Docker) |
| Frontend | React 19 + Vite |
| UI | Tailwind CSS |
| Real-time | Socket.io |
| Monorepo | pnpm workspaces |

## AI Agents

**Order Agent** — Automatically processes new orders:
- Validates order completeness
- Checks artisan availability and specialties
- Auto-confirms routine orders or escalates edge cases to humans
- Wired to BullMQ: triggers automatically when an order is confirmed

**Supervisor Agent** — Generates daily operations summaries:
- Analyzes orders, production pipeline, escalations, and agent activity
- Produces structured reports with findings and recommendations
- Triggered on-demand from the Agent Control page in the dashboard

## Requirements

- Node.js 20+
- pnpm
- Docker Desktop (16 GB+ RAM recommended for the AI model)
