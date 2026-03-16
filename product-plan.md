# Product Plan: Artisan Furniture Platform

## 1. Executive Summary

This plan lays out the complete product development roadmap for a premium handcrafted furniture e-commerce and operations platform. The system manages the end-to-end workflow — from customer order intake at a US showroom through artisan manufacturing in India, international logistics, and final delivery — with AI agent automation built in from the ground up.

The platform is MCP-native: every business operation is exposed as an MCP tool, resource, or prompt. This means the same backend infrastructure powers both human dashboards and AI agents, enabling semi-autonomous business management where agents handle routine operations and escalate complex decisions to humans.

**Timeline estimate:** 16–20 weeks to MVP (single developer, startup budget)
**Tech stack:** React/TypeScript · Node.js · PostgreSQL · Redis/BullMQ · MCP SDK


## 2. Product Vision

**For** US customers who want premium, custom handcrafted furniture
**Who** value artisan quality but need a seamless modern buying experience
**The** Artisan Furniture Platform is an order-to-delivery system
**That** connects customers with Indian artisan manufacturing through a transparent, AI-managed workflow
**Unlike** traditional furniture retailers with opaque supply chains and manual coordination
**Our product** provides real-time order visibility, AI-driven operations, and a human-in-the-loop system that scales with one showroom and a two-person founding team.


## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND LAYER                     │
│  React/TypeScript SPA                                │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Customer     │  │  Admin       │  │  Showroom  │ │
│  │  Portal       │  │  Dashboard   │  │  Kiosk     │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
└─────────┼─────────────────┼────────────────┼────────┘
          │                 │                │
          ▼                 ▼                ▼
┌─────────────────────────────────────────────────────┐
│                  API LAYER (Node.js)                  │
│  REST API  ·  WebSocket  ·  Auth (JWT)               │
│  ┌────────────────────────────────────────────────┐  │
│  │              MCP SERVER                         │  │
│  │  Tools · Resources · Prompts                    │  │
│  │  (unified interface for humans + AI agents)     │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┼────────────────┐
          ▼            ▼                ▼
┌──────────────┐ ┌──────────┐ ┌──────────────────┐
│  PostgreSQL  │ │  Redis   │ │  External APIs   │
│  (data)      │ │  BullMQ  │ │  Shipping, FX,   │
│              │ │  (queue) │ │  Payments, Notif  │
└──────────────┘ └──────────┘ └──────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                   AI AGENT LAYER                      │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ Order   │ │Production│ │Logistics │ │Customer │ │
│  │ Agent   │ │ Agent    │ │ Agent    │ │ Agent   │ │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └────┬────┘ │
│       └───────────┴────────────┴─────────────┘      │
│                        │                             │
│              ┌─────────▼──────────┐                  │
│              │  Supervisor Agent  │                  │
│              │  (orchestration +  │                  │
│              │   escalation)      │                  │
│              └────────────────────┘                  │
└─────────────────────────────────────────────────────┘
```

### 3.2 MCP Integration Pattern

Every business operation follows this pattern:

```
Operation → MCP Tool Definition → API Endpoint → Database
                ↕                      ↕
           AI Agent access        Human dashboard access
```

This means adding a new business capability automatically makes it available to both humans (via dashboard) and AI agents (via MCP tools). No separate integration work.


## 4. Database Schema Design (Phase 1)

### 4.1 Core Entities

**customers** — US customers who place orders
- id, name, email, phone, address (JSON), preferences (JSON), created_at, updated_at

**orders** — custom furniture orders
- id, customer_id, status (enum), order_type, total_amount, currency, deposit_amount, deposit_paid_at, estimated_delivery, showroom_notes, created_at, updated_at

**order_items** — individual pieces within an order
- id, order_id, product_type, description, specifications (JSON), material, dimensions (JSON), quantity, unit_price, status (enum), artisan_id

**artisans** — Indian craftspeople / workshops
- id, name, workshop_name, location, specialties (JSON array), capacity_status, quality_rating, contact_info (JSON), active

**production_tasks** — manufacturing work units
- id, order_item_id, artisan_id, status (enum), started_at, estimated_completion, completed_at, quality_check_status, quality_notes, photos (JSON array)

**shipments** — international and domestic logistics
- id, order_id, type (enum: international, domestic), carrier, tracking_number, origin, destination, status (enum), customs_declaration_id, estimated_arrival, actual_arrival

**payments** — financial transactions
- id, order_id, type (enum: deposit, progress, final, refund), amount, currency, status, payment_method, processed_at, external_ref

**events** — audit trail and agent activity log
- id, entity_type, entity_id, event_type, actor (enum: human, agent), actor_id, data (JSON), created_at

**agent_actions** — AI agent action log with escalation tracking
- id, agent_type, action_type, input (JSON), output (JSON), status (enum: pending, approved, executed, escalated, rejected), escalation_reason, human_response, created_at

**notifications** — messages to humans from agents or system
- id, recipient_type, recipient_id, channel (enum: email, sms, dashboard, push), subject, body, read, sent_at

### 4.2 Key Enums

```
order_status: draft → confirmed → in_production → quality_check →
              ready_to_ship → in_transit → customs → delivered → completed

production_status: pending → assigned → in_progress → quality_check →
                   approved → rejected → rework

shipment_status: preparing → picked_up → in_transit → customs_hold →
                 customs_cleared → out_for_delivery → delivered
```

### 4.3 Indexes Strategy

Priority indexes for the queries agents will run most frequently: orders by status, orders by customer, production tasks by artisan and status, shipments by status, events by entity, and agent actions by status (especially "pending" for human review queues).


## 5. Core API Design (Phase 2)

### 5.1 API Modules

Each module maps directly to MCP tools later.

**Orders API**
- `POST /orders` — create order (from showroom or customer portal)
- `GET /orders/:id` — full order details with items, payments, shipments
- `PATCH /orders/:id` — update order status, notes
- `GET /orders?status=&customer=&date_range=` — filtered listing
- `POST /orders/:id/items` — add item to order
- `POST /orders/:id/confirm` — confirm order + trigger production flow

**Production API**
- `POST /production/tasks` — create production task for artisan
- `PATCH /production/tasks/:id` — update status, add photos
- `POST /production/tasks/:id/quality-check` — submit quality review
- `GET /production/dashboard` — overview of all active production

**Logistics API**
- `POST /shipments` — create shipment record
- `PATCH /shipments/:id` — update tracking, status
- `GET /shipments/:id/tracking` — real-time tracking info
- `POST /shipments/:id/customs` — update customs status

**Customers API**
- `POST /customers` — create customer profile
- `GET /customers/:id/orders` — customer order history
- `POST /customers/:id/notify` — send notification

**Payments API**
- `POST /payments` — record payment
- `GET /orders/:id/payments` — payment history for order
- `GET /payments/outstanding` — unpaid balances

**Agent API**
- `GET /agent/actions?status=pending` — human review queue
- `POST /agent/actions/:id/approve` — approve agent action
- `POST /agent/actions/:id/reject` — reject with feedback
- `GET /agent/activity` — agent activity feed

### 5.2 Authentication & Authorization

JWT-based auth with role-based access:
- **admin** — full access (Sid + partner)
- **showroom** — order creation, customer management
- **customer** — own orders, profile, notifications
- **agent** — scoped per agent type (Order Agent can't modify shipments)

### 5.3 Webhook / Event System

Every state change emits an event to Redis/BullMQ:
```
order.created → triggers: notify customer, create production tasks
order.confirmed → triggers: assign artisans, send deposit receipt
production.completed → triggers: quality check, notify logistics
shipment.customs_cleared → triggers: schedule delivery, notify customer
agent.action_pending → triggers: notify human for review
```


## 6. MCP Server Implementation (Phase 3)

### 6.1 MCP Tools (Actions)

Each API endpoint becomes an MCP tool. Example definitions:

```
Tool: create_order
  Description: Create a new furniture order for a customer
  Inputs: customer_id, items[], showroom_notes
  Returns: order object with ID and status

Tool: update_production_status
  Description: Update manufacturing status for a production task
  Inputs: task_id, status, notes, photos[]
  Returns: updated task object

Tool: check_shipment_status
  Description: Get current status and location of a shipment
  Inputs: shipment_id
  Returns: shipment details with tracking

Tool: send_customer_notification
  Description: Send a message to a customer via their preferred channel
  Inputs: customer_id, subject, body, channel
  Returns: notification status

Tool: escalate_to_human
  Description: Flag a decision for human review
  Inputs: context, decision_needed, urgency, suggested_action
  Returns: escalation ticket ID
```

### 6.2 MCP Resources (Data Access)

```
Resource: orders://active — all active orders with current status
Resource: production://dashboard — production overview across artisans
Resource: shipments://in-transit — all shipments currently moving
Resource: customers://recent — recently active customers
Resource: metrics://daily — daily business metrics snapshot
```

### 6.3 MCP Prompts (Agent Behaviors)

```
Prompt: daily_operations_review
  → Generates morning briefing: orders needing attention, production
    delays, shipments arriving, payments outstanding

Prompt: customer_update_draft
  → Drafts a customer-facing update for a specific order

Prompt: production_delay_response
  → Analyzes a delay and suggests recovery options

Prompt: escalation_summary
  → Summarizes an issue for human decision-making
```


## 7. Human Dashboard (Phase 4)

### 7.1 Dashboard Views

**Home / Overview**
- Active orders count + status breakdown
- Production pipeline visualization
- Shipments in transit map view
- Pending agent actions requiring approval
- Revenue summary (this week / month)

**Order Management**
- Order list with filters (status, date, customer)
- Order detail view with full timeline
- Quick actions: confirm, update, cancel
- Customer communication thread

**Production Tracker**
- Kanban board: pending → in progress → quality check → done
- Artisan workload view
- Photo gallery from production updates
- Quality check approval interface

**Logistics**
- Shipment timeline view
- Customs status tracker
- Delivery scheduling
- Carrier integration status

**Agent Control Center**
- Pending approvals queue (most important view)
- Agent activity feed with action details
- Agent performance metrics
- Override / correction interface
- Escalation history

**Settings**
- Agent configuration (escalation thresholds, notification preferences)
- User management
- Integration settings

### 7.2 Frontend Tech Decisions

- React + TypeScript with Vite
- TanStack Query for API state
- Tailwind CSS for styling
- React Router for navigation
- WebSocket connection for real-time updates (agent actions, order status changes)
- Responsive but desktop-first (showroom use case)


## 8. Event Queue System (Phase 5)

### 8.1 Queue Architecture (Redis + BullMQ)

```
Queues:
├── order-events        — order lifecycle events
├── production-events   — manufacturing status changes
├── logistics-events    — shipment and customs updates
├── notification-queue  — outbound messages (email, SMS, push)
├── agent-task-queue    — tasks for AI agents to process
└── escalation-queue    — items requiring human attention
```

### 8.2 Event Flow Example: New Order

```
1. Customer places order via portal/showroom
2. API creates order → emits "order.created" to order-events queue
3. Worker processes event:
   a. Sends confirmation email (notification-queue)
   b. Creates production tasks (production-events)
   c. Logs to events table
4. Order Agent picks up from agent-task-queue:
   a. Validates order completeness
   b. Suggests artisan assignments
   c. Estimates timeline
   d. If confident → auto-assigns (logs action)
   e. If uncertain → escalates to human (escalation-queue)
5. Human sees escalation on dashboard → approves/modifies
6. Production begins
```

### 8.3 Retry & Dead Letter Strategy

Failed jobs retry 3 times with exponential backoff (1min, 5min, 30min). After 3 failures, jobs move to a dead letter queue and trigger a notification to Sid. Agent-related failures always escalate to human review.


## 9. AI Agent Design (Phase 6)

### 9.1 Agent Architecture

Each agent is a Claude-powered process that connects to the MCP server and operates within defined boundaries.

```
Agent Configuration:
├── Allowed MCP tools (scoped per agent)
├── Escalation rules (when to involve humans)
├── Confidence thresholds (auto-act vs. ask)
├── Notification preferences (what to report)
└── Operating hours / rate limits
```

### 9.2 Agent Specifications

**Order Agent**
- Scope: order intake, validation, pricing assistance, customer queries
- Auto-actions: send order confirmations, request missing info, update statuses
- Escalate: custom pricing, unusual specifications, order modifications > $500
- Tools: create_order, update_order, send_customer_notification, get_order_details

**Production Agent**
- Scope: artisan assignment, timeline tracking, quality oversight
- Auto-actions: assign artisans (based on specialties + capacity), send reminders for overdue tasks, flag quality issues from photos
- Escalate: artisan unavailability, quality failures, timeline delays > 1 week
- Tools: create_production_task, update_production_status, check_artisan_capacity, escalate_to_human

**Logistics Agent**
- Scope: shipment coordination, customs tracking, delivery scheduling
- Auto-actions: create shipment records, update tracking, notify customers of delivery windows
- Escalate: customs holds, damaged goods reports, delivery failures
- Tools: create_shipment, update_shipment, check_customs_status, send_customer_notification

**Customer Agent**
- Scope: customer communications, order status inquiries, follow-ups
- Auto-actions: respond to status queries, send proactive updates, request reviews post-delivery
- Escalate: complaints, refund requests, negative feedback
- Tools: get_order_details, send_customer_notification, escalate_to_human

**Supervisor Agent**
- Scope: orchestration, cross-agent coordination, human reporting
- Auto-actions: generate daily briefings, coordinate multi-agent workflows, resolve agent conflicts
- Escalate: systemic issues, budget decisions, strategic choices
- Tools: all tools (read-only for most), generate_report, escalate_to_human
- Special: monitors other agents' actions and can pause/override them

### 9.3 Escalation Framework

```
Level 1 — Agent auto-handles, logs action
  Example: send order confirmation, update shipment status

Level 2 — Agent acts but notifies human
  Example: assign artisan, adjust timeline by < 3 days

Level 3 — Agent proposes, human approves
  Example: custom pricing, artisan change, timeline delay > 1 week

Level 4 — Agent flags, human decides
  Example: quality failure, customer complaint, refund > $200

Level 5 — Immediate human alert
  Example: customs seizure, fraud suspicion, system errors
```

### 9.4 Agent Safety Guardrails

- No agent can process payments or refunds without human approval
- No agent can delete data — only soft-delete via status changes
- All agent actions are logged with full input/output
- Rate limiting: max 50 actions per agent per hour (configurable)
- Kill switch: any agent can be paused from the dashboard instantly
- Daily digest of all agent activity sent to Sid


## 10. Development Phases & Timeline

### Phase 1: Foundation (Weeks 1–3)
- PostgreSQL schema design and migration setup
- Database seeding scripts with test data
- Basic project scaffolding (monorepo with packages)
- CI/CD pipeline (GitHub Actions)
**Deliverable:** Working database with migrations

### Phase 2: Core API (Weeks 4–6)
- Node.js API with Express or Fastify
- All CRUD endpoints for core entities
- JWT authentication + role-based authorization
- Input validation and error handling
- API documentation (OpenAPI/Swagger)
**Deliverable:** Fully functional REST API

### Phase 3: MCP Server (Weeks 7–9)
- MCP SDK integration
- Tool definitions for all API operations
- Resource definitions for data access
- Prompt definitions for agent behaviors
- MCP server testing harness
**Deliverable:** MCP server exposing all business operations

### Phase 4: Human Dashboard (Weeks 10–13)
- React app with routing and auth
- Order management views
- Production tracker (Kanban board)
- Agent control center
- Real-time updates via WebSocket
- Mobile-responsive for showroom tablet use
**Deliverable:** Functional admin dashboard

### Phase 5: Event Queue (Weeks 14–15)
- Redis + BullMQ setup
- Event emitters in API layer
- Worker processes for each queue
- Dead letter queue + monitoring
- Notification service (email via SendGrid/SES, SMS via Twilio)
**Deliverable:** Event-driven processing pipeline

### Phase 6: AI Agents (Weeks 16–20)
- Order Agent (simplest, build first)
- Customer Agent
- Production Agent
- Logistics Agent
- Supervisor Agent (last, depends on others)
- Escalation workflow + approval UI
- Agent monitoring dashboard
**Deliverable:** Semi-autonomous AI operations

### Post-MVP Roadmap
- Customer-facing order portal
- Artisan mobile app (production updates from India)
- Advanced analytics and business intelligence
- Multi-showroom support
- Inventory management for materials
- AR/VR furniture preview for customers


## 11. Infrastructure & DevOps

### 11.1 Hosting (Budget-Conscious)

**Recommended start:**
- Railway or Render for API + MCP server (starts free, scales to ~$20/mo)
- Neon or Supabase for PostgreSQL (free tier is generous)
- Upstash for Redis (free tier: 10K commands/day)
- Vercel for frontend (free for personal)
- Anthropic API for AI agents (~$50–100/mo depending on volume)

**Total estimated monthly cost at launch: $75–150/mo**

### 11.2 Monitoring

- Application: Sentry (free tier) for error tracking
- Uptime: Better Stack or UptimeRobot (free tier)
- Logs: structured JSON logging → stdout (platform captures)
- Agent monitoring: custom dashboard view + daily email digest

### 11.3 Security

- All API endpoints require authentication
- Agent API keys scoped per agent type
- Sensitive data encrypted at rest (customer PII, payment refs)
- HTTPS everywhere
- Rate limiting on all endpoints
- Audit log for all state changes


## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Single developer bottleneck | High | Prioritize ruthlessly; MVP-only features first; use AI coding tools |
| India timezone coordination | Medium | Async-first design; agents bridge timezone gap; daily automated briefings |
| Customs/import complexity | High | Start with a customs broker; Logistics Agent learns over time |
| AI agent reliability | Medium | Conservative escalation thresholds at first; widen autonomy gradually |
| Startup budget constraints | Medium | Free tiers everywhere; upgrade only when needed; monorepo reduces infra |
| Customer trust in AI-managed orders | Medium | Transparent order tracking; human always reachable; agents invisible to customers |


## 13. Success Metrics (First 6 Months)

- System uptime > 99.5%
- Order processing time (intake to production start) < 24 hours
- Agent auto-resolution rate > 60% of routine tasks
- Escalation response time < 4 hours during business hours
- Customer order visibility: real-time status for 100% of orders
- Zero data loss or security incidents


## 14. Open Decisions

These need resolution before or during development:

1. **Payment processor** — Stripe (simplest) vs. Square (showroom POS) vs. both?
2. **Customs broker partnership** — who handles import paperwork initially?
3. **Customer portal scope for MVP** — full self-service or just order tracking?
4. **Artisan communication channel** — WhatsApp API, custom app, or email?
5. **Photo/asset storage** — S3 (AWS) vs. Cloudflare R2 (cheaper) vs. Supabase Storage?
6. **Domain and branding** — needed for customer-facing portal and emails
