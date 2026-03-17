#!/usr/bin/env bash
# ─── Artisan Furniture — One-Command Setup ─────────────────────
#
# This script gets the entire POC running from scratch.
# Run it from the project root:  ./scripts/setup.sh
#
# What it does:
# 1. Checks prerequisites (Node, pnpm, Docker)
# 2. Copies .env.example → .env (if needed)
# 3. Installs dependencies
# 4. Starts Docker containers (PostgreSQL, Redis, Ollama)
# 5. Waits for services to be healthy
# 6. Runs database migrations
# 7. Seeds the database with sample data
# 8. Pulls the Llama 3.1 model into Ollama (if not already there)
#
# After this, you can run:
#   pnpm dev:api        — Start the API server (port 3000)
#   pnpm dev:dashboard  — Start the React dashboard (port 5173)

set -e  # Stop on any error

echo ""
echo "========================================"
echo "  Artisan Furniture — POC Setup"
echo "========================================"
echo ""

# ── Step 1: Check prerequisites ────────────────────────────────

echo "[1/7] Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "  ERROR: Node.js is not installed."
  echo "  Install it from https://nodejs.org (v20 LTS recommended)"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "  WARNING: Node.js v$NODE_VERSION detected. v20+ recommended."
fi

if ! command -v pnpm &> /dev/null; then
  echo "  ERROR: pnpm is not installed."
  echo "  Install it with: npm install -g pnpm"
  exit 1
fi

if ! command -v docker &> /dev/null; then
  echo "  ERROR: Docker is not installed."
  echo "  Install Docker Desktop from https://docker.com"
  exit 1
fi

if ! docker info &> /dev/null; then
  echo "  ERROR: Docker is not running."
  echo "  Open Docker Desktop and wait for it to start."
  exit 1
fi

echo "  Node.js $(node -v), pnpm $(pnpm -v), Docker $(docker -v | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')"
echo ""

# ── Step 2: Environment file ───────────────────────────────────

echo "[2/7] Setting up environment..."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "  Created .env from .env.example"
else
  echo "  .env already exists — skipping"
fi
echo ""

# ── Step 3: Install dependencies ───────────────────────────────

echo "[3/7] Installing dependencies..."
pnpm install
echo ""

# ── Step 4: Start Docker containers ────────────────────────────

echo "[4/7] Starting Docker containers..."
docker compose up -d
echo ""

# ── Step 5: Wait for services to be healthy ────────────────────

echo "[5/7] Waiting for services to be ready..."

# Wait for PostgreSQL
echo -n "  PostgreSQL: "
for i in {1..30}; do
  if docker exec artisan-postgres pg_isready -U artisan -d artisan_furniture &> /dev/null; then
    echo "ready"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "TIMEOUT — could not connect to PostgreSQL"
    exit 1
  fi
  sleep 1
done

# Wait for Redis
echo -n "  Redis: "
for i in {1..15}; do
  if docker exec artisan-redis redis-cli ping &> /dev/null; then
    echo "ready"
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo "TIMEOUT — could not connect to Redis"
    exit 1
  fi
  sleep 1
done

# Wait for Ollama
echo -n "  Ollama: "
for i in {1..15}; do
  if curl -s http://localhost:11434/api/tags &> /dev/null; then
    echo "ready"
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo "TIMEOUT — could not connect to Ollama"
    exit 1
  fi
  sleep 1
done
echo ""

# ── Step 6: Database setup ─────────────────────────────────────

echo "[6/7] Setting up database..."
echo "  Running migrations..."
pnpm db:migrate
echo "  Seeding sample data..."
pnpm db:seed
echo ""

# ── Step 7: Pull LLM model ────────────────────────────────────

echo "[7/7] Checking AI model..."

# Check if llama3.1 is already pulled
if curl -s http://localhost:11434/api/tags | grep -q "llama3.1"; then
  echo "  Llama 3.1 8B is already available"
else
  echo "  Pulling Llama 3.1 8B (4.9 GB — this may take a while)..."
  docker exec artisan-ollama ollama pull llama3.1
fi
echo ""

# ── Done! ──────────────────────────────────────────────────────

echo "========================================"
echo "  Setup complete!"
echo "========================================"
echo ""
echo "  Start the API:        pnpm dev:api"
echo "  Start the dashboard:  pnpm dev:dashboard"
echo ""
echo "  API:       http://localhost:3000"
echo "  Swagger:   http://localhost:3000/docs"
echo "  Dashboard: http://localhost:5173"
echo ""
echo "  Login:     admin / admin123"
echo ""
echo "  Run the demo:  ./scripts/demo.sh"
echo ""
