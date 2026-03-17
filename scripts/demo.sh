#!/usr/bin/env bash
# ─── Artisan Furniture — End-to-End Demo ───────────────────────
#
# This script walks through a complete order lifecycle,
# demonstrating all layers of the system working together:
#
#   Customer places order → Order Agent reviews it →
#   Production tasks created → Artisan completes work →
#   Shipment created → Delivered to customer →
#   Supervisor generates daily summary
#
# Prerequisites:
#   1. Run ./scripts/setup.sh first (or docker compose up -d + pnpm db:seed)
#   2. Start the API: pnpm dev:api (in another terminal)
#   3. Optionally start the dashboard: pnpm dev:dashboard (to watch live)
#
# Usage:  ./scripts/demo.sh
#
# Tip: Open the dashboard at http://localhost:5173 in your browser
# to see changes appear in real-time as the demo runs!

set -e

API="http://localhost:3000"

# Colors for readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Helper: print a step header ────────────────────────────────
step() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# ── Helper: pause for readability ──────────────────────────────
pause() {
  echo ""
  echo -e "${YELLOW}  ▸ Press Enter to continue...${NC}"
  read -r
}

# ── Helper: make an API call and pretty-print ──────────────────
api_call() {
  local METHOD=$1
  local ENDPOINT=$2
  local BODY=$3

  if [ -n "$BODY" ]; then
    curl -s -X "$METHOD" "$API$ENDPOINT" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$BODY" | python3 -m json.tool 2>/dev/null || echo "(response not JSON)"
  else
    curl -s -X "$METHOD" "$API$ENDPOINT" \
      -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null || echo "(response not JSON)"
  fi
}

# ════════════════════════════════════════════════════════════════
#  START OF DEMO
# ════════════════════════════════════════════════════════════════

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║   ${BOLD}Artisan Furniture Co. — End-to-End Demo${NC}${GREEN}              ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║   Premium handcrafted furniture from India to the US   ║${NC}"
echo -e "${GREEN}║   Powered by AI agents running locally on your Mac     ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check API is running
if ! curl -s "$API/health" > /dev/null 2>&1; then
  echo -e "  ${YELLOW}ERROR: API is not running at $API${NC}"
  echo "  Start it with: pnpm dev:api"
  exit 1
fi
echo -e "  ${GREEN}API is running at $API${NC}"
echo ""

# ── Step 1: Login ──────────────────────────────────────────────

step "Step 1: Login to the system"

echo "  Authenticating as admin..."
TOKEN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo -e "  ${GREEN}Logged in. JWT token received.${NC}"

pause

# ── Step 2: Create a new order ─────────────────────────────────

step "Step 2: A customer walks into the showroom"

echo "  Sarah Chen wants a custom teak dining table and 4 chairs."
echo "  The showroom staff creates an order in the system..."
echo ""

ORDER=$(api_call POST "/api/orders" '{
  "customerId": 1,
  "orderType": "custom",
  "totalAmount": "4500.00",
  "showroomNotes": "Customer wants a 6-seater teak dining table with hand-carved legs, plus 4 matching chairs with cushioned seats. Prefers traditional Rajasthani style."
}')

ORDER_ID=$(echo "$ORDER" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

echo "$ORDER"
echo ""
echo -e "  ${GREEN}Order #$ORDER_ID created (status: draft)${NC}"

pause

# ── Step 3: Add items to the order ─────────────────────────────

step "Step 3: Adding items to the order"

echo "  Item 1: Teak dining table..."
api_call POST "/api/orders/$ORDER_ID/items" '{
  "productType": "dining_table",
  "material": "Teak wood",
  "description": "6-seater dining table with hand-carved legs, Rajasthani style",
  "quantity": 1,
  "unitPrice": "3200.00"
}' > /dev/null

echo -e "  ${GREEN}Added: Teak dining table — \$3,200${NC}"
echo ""

echo "  Item 2: Set of 4 matching chairs..."
api_call POST "/api/orders/$ORDER_ID/items" '{
  "productType": "chair",
  "material": "Teak wood",
  "description": "Matching chairs with cushioned seats, Rajasthani style",
  "quantity": 4,
  "unitPrice": "325.00"
}' > /dev/null

echo -e "  ${GREEN}Added: 4x Teak chairs — \$325 each${NC}"

pause

# ── Step 4: Confirm the order ──────────────────────────────────

step "Step 4: Confirming the order (this triggers the AI agent)"

echo "  When we confirm the order, three things happen automatically:"
echo "    1. Production tasks are created for each item"
echo "    2. An artisan is assigned to each task"
echo "    3. The Order Agent (AI) is queued to review the assignments"
echo ""
echo "  Confirming order #$ORDER_ID..."
echo ""

api_call PATCH "/api/orders/$ORDER_ID/status" '{"status": "confirmed"}'

echo ""
echo -e "  ${GREEN}Order confirmed! Check the API server terminal — you should"
echo -e "  see the workers creating production tasks and queuing the agent.${NC}"
echo ""
echo -e "  ${CYAN}The Order Agent is now running in the background. It will:"
echo -e "    - Fetch the order details from the database"
echo -e "    - Validate the order (customer exists, items present, pricing OK)"
echo -e "    - Check artisan availability and specialties"
echo -e "    - Make a decision: confirm or escalate to a human${NC}"
echo ""
echo -e "  ${YELLOW}This takes 2-5 minutes because the LLM runs on CPU.${NC}"

pause

# ── Step 5: Check production tasks ─────────────────────────────

step "Step 5: Checking production pipeline"

echo "  Let's see what production tasks were created..."
echo ""

api_call GET "/api/production"

echo ""
echo -e "  ${GREEN}Production tasks are queued and assigned to artisans!${NC}"
echo -e "  ${CYAN}In the dashboard's Production tab, you'll see these as"
echo -e "  cards in the Kanban board's 'Pending' column.${NC}"

pause

# ── Step 6: Simulate production progress ───────────────────────

step "Step 6: Simulating production (artisan starts working)"

echo "  The artisan in India begins crafting the dining table..."
echo ""

# Get the production task IDs for our order's items
TASKS=$(curl -s "$API/api/production" -H "Authorization: Bearer $TOKEN")
# Get the last two tasks (the ones we just created)
TASK_1=$(echo "$TASKS" | python3 -c "import sys,json; tasks=json.load(sys.stdin); print(tasks[-2]['id'])" 2>/dev/null)
TASK_2=$(echo "$TASKS" | python3 -c "import sys,json; tasks=json.load(sys.stdin); print(tasks[-1]['id'])" 2>/dev/null)

if [ -n "$TASK_1" ] && [ "$TASK_1" != "None" ]; then
  echo "  Moving task #$TASK_1 (dining table) → in_progress..."
  api_call PATCH "/api/production/$TASK_1/status" '{"status": "in_progress"}' > /dev/null
  echo -e "  ${GREEN}Task #$TASK_1: in_progress${NC}"

  echo "  Moving task #$TASK_2 (chairs) → in_progress..."
  api_call PATCH "/api/production/$TASK_2/status" '{"status": "in_progress"}' > /dev/null
  echo -e "  ${GREEN}Task #$TASK_2: in_progress${NC}"
  echo ""

  echo "  Weeks pass... the artisan completes both items."
  echo ""

  echo "  Moving task #$TASK_1 → quality_check..."
  api_call PATCH "/api/production/$TASK_1/status" '{"status": "quality_check"}' > /dev/null
  echo "  Moving task #$TASK_1 → approved..."
  api_call PATCH "/api/production/$TASK_1/status" '{"status": "approved"}' > /dev/null
  echo -e "  ${GREEN}Task #$TASK_1: approved (dining table passed QC)${NC}"
  echo ""

  echo "  Moving task #$TASK_2 → quality_check..."
  api_call PATCH "/api/production/$TASK_2/status" '{"status": "quality_check"}' > /dev/null
  echo "  Moving task #$TASK_2 → approved..."
  api_call PATCH "/api/production/$TASK_2/status" '{"status": "approved"}' > /dev/null
  echo -e "  ${GREEN}Task #$TASK_2: approved (chairs passed QC)${NC}"
  echo ""
  echo -e "  ${CYAN}When all tasks for an order are approved, the system"
  echo -e "  automatically creates a shipment!${NC}"
else
  echo -e "  ${YELLOW}Could not find production tasks — they may still be creating.${NC}"
  echo "  Check the API logs or try again in a moment."
fi

pause

# ── Step 7: Check shipments ────────────────────────────────────

step "Step 7: Checking shipments"

echo "  A shipment should have been auto-created when production completed..."
echo ""

api_call GET "/api/shipments"

echo ""
echo -e "  ${GREEN}The furniture is being shipped from India to the US!${NC}"

pause

# ── Step 8: Generate Supervisor Summary ────────────────────────

step "Step 8: Supervisor Agent — Daily Operations Summary"

echo "  Let's ask the Supervisor Agent to analyze today's operations."
echo "  This queues a background job — the LLM will gather data from"
echo "  all orders, production tasks, and escalations, then generate"
echo "  a structured report."
echo ""

api_call POST "/api/agent/summary" '{}'

echo ""
echo -e "  ${GREEN}Summary generation queued!${NC}"
echo -e "  ${YELLOW}This runs in the background (2-5 minutes on CPU).${NC}"
echo -e "  ${CYAN}Watch the API terminal for the Supervisor Agent's output,"
echo -e "  or check the Agent Control page in the dashboard.${NC}"

pause

# ── Step 9: Final state ────────────────────────────────────────

step "Step 9: Final order status"

echo "  Let's check our order one more time..."
echo ""

api_call GET "/api/orders/$ORDER_ID"

echo ""

# ── Done! ──────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║   ${BOLD}Demo Complete!${NC}${GREEN}                                       ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║   What you just saw:                                   ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║   1. Order created at US showroom                      ║${NC}"
echo -e "${GREEN}║   2. AI agent automatically reviewed the order         ║${NC}"
echo -e "${GREEN}║   3. Production tasks assigned to Indian artisans      ║${NC}"
echo -e "${GREEN}║   4. Artisan crafted the furniture (simulated)         ║${NC}"
echo -e "${GREEN}║   5. Quality check passed                              ║${NC}"
echo -e "${GREEN}║   6. International shipment auto-created               ║${NC}"
echo -e "${GREEN}║   7. Supervisor generated operations summary           ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║   All running locally. Zero cloud costs.               ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
