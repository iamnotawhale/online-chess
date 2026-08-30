#!/bin/bash
set -euo pipefail

COMPOSE_FILE="docker-compose.odyssey.yml"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$APP_DIR"
echo "Deploying OnChess on Odyssey ($APP_DIR)..."

if [ ! -f .env ]; then
    echo ".env not found! Set GitHub secret ENV_FILE or create .env manually."
    exit 1
fi

# shellcheck disable=SC1091
source .env

# Support legacy .env from pol/infra (POSTGRES_PASSWORD -> DB_PASSWORD)
if [ -z "${DB_PASSWORD:-}" ] && [ -n "${POSTGRES_PASSWORD:-}" ]; then
    DB_PASSWORD="$POSTGRES_PASSWORD"
    export DB_PASSWORD
fi
if [ -z "${FRONTEND_URL:-}" ]; then
    FRONTEND_URL="https://${DOMAIN:-onchess.online}"
    export FRONTEND_URL
fi

missing=()
[ -z "${DB_PASSWORD:-}" ] && missing+=("DB_PASSWORD")
[ -z "${JWT_SECRET:-}" ] && missing+=("JWT_SECRET")
if [ "${#missing[@]}" -gt 0 ]; then
    echo "Missing required .env variables: ${missing[*]}"
    echo "See .env.example for the expected format."
    exit 1
fi

SCRIPT_PATH="$APP_DIR/deploy-odyssey.sh"
if [ "${DEPLOY_FROM_CI:-}" != "1" ] && [ "${DEPLOY_REEXEC:-}" != "1" ] && [ -d .git ]; then
    echo "Pulling latest code..."
    git fetch origin
    if git rev-parse --verify origin/main >/dev/null 2>&1; then
        git reset --hard origin/main
    else
        git checkout -f main 2>/dev/null || true
    fi
    echo "Re-executing deploy script..."
    export DEPLOY_REEXEC=1
    exec "$SCRIPT_PATH" "$@"
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "Docker not installed. Run: sudo bash scripts/setup-odyssey-server.sh"
    exit 1
fi

DOCKER_COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
fi

chmod +x db/apply-migrations.sh scripts/*.sh 2>/dev/null || true

echo "Starting PostgreSQL..."
$DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d postgres

echo "Waiting for PostgreSQL..."
for _ in $(seq 1 30); do
    if docker exec chess_postgres_prod pg_isready -U chess -d chessonline >/dev/null 2>&1; then
        break
    fi
    sleep 2
done
docker exec chess_postgres_prod pg_isready -U chess -d chessonline

echo "Applying migrations..."
./db/apply-migrations.sh

echo "Preparing backend JAR..."
mkdir -p deploy
if [ ! -f deploy/chessonline-backend.jar ]; then
    echo "Fetching backend JAR from pol..."
    scp -o StrictHostKeyChecking=accept-new "root@${POL_HOST:-144.31.102.74}:/tmp/chessonline-backend.jar" deploy/chessonline-backend.jar
fi

echo "Preparing frontend dist..."
if [ ! -f frontend-dist/index.html ]; then
    echo "Building frontend..."
    (cd frontend && npm ci && npm run build)
    rm -rf frontend-dist && cp -a frontend/dist frontend-dist
fi

echo "Building backend and frontend..."
$DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d --build backend frontend

echo "Waiting for backend..."
for _ in $(seq 1 30); do
    if curl -sf http://127.0.0.1:8082/api/health >/dev/null 2>&1; then
        break
    fi
    sleep 3
done

echo "Service status:"
$DOCKER_COMPOSE -f "$COMPOSE_FILE" ps

if [ -f infra/caddy-onchess.caddyfile ] && [ -f /etc/caddy/Caddyfile ]; then
    if ! grep -q "onchess.online" /etc/caddy/Caddyfile; then
        echo "Adding onchess.online to Caddy..."
        sudo tee -a /etc/caddy/Caddyfile < infra/caddy-onchess.caddyfile >/dev/null
    fi
    sudo caddy validate --config /etc/caddy/Caddyfile
    sudo systemctl reload caddy
fi

curl -sf http://127.0.0.1:8082/api/health && echo ""
curl -sf -o /dev/null -w "Frontend: HTTP %{http_code}\n" http://127.0.0.1:3000/ || true

echo "Deployment complete!"
echo "Site: https://${DOMAIN:-onchess.online}"
