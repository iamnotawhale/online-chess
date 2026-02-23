#!/bin/bash
set -e

echo "🚀 Deploying Chess Online..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found! Copy .env.example to .env and fill in the values."
    exit 1
fi

# Load environment variables
source .env

# Pull latest code
echo "📥 Pulling latest code..."
git fetch origin
git checkout main
git reset --hard origin/main

# Re-execute this script if it was updated
SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
if [ "$DEPLOY_REEXEC" != "1" ]; then
    echo "🔄 Script updated, re-executing..."
    export DEPLOY_REEXEC=1
    exec "$SCRIPT_PATH" "$@"
fi

# Replace domain in nginx.conf
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" nginx.conf

# Stop existing containers
echo "⏹️  Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Remove dangling containers with wrong names
echo "🧹 Cleaning up old containers..."
docker rm -f $(docker ps -a -q --filter "name=chess_") 2>/dev/null || true

# Start postgres first
echo "🗄️  Starting PostgreSQL..."
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for postgres to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10
until docker exec chess_postgres_prod pg_isready -U chess -d chessonline > /dev/null 2>&1; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done
echo "✅ PostgreSQL is ready"

# Apply database migrations
echo "💾 Applying database migrations..."
./db/apply-migrations.sh

# Build and start remaining containers
echo "🔨 Building and starting backend, frontend and nginx..."
docker-compose -f docker-compose.prod.yml up -d --build backend frontend nginx

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose -f docker-compose.prod.yml ps

# Start Telegram log bot if configured
echo "🤖 Starting Telegram log watcher (if configured)..."
./scripts/start-telegram-log-bot.sh || true

echo "✅ Deployment complete!"
echo "📱 Frontend: https://$DOMAIN"
echo "🔧 Backend: https://$DOMAIN/api"
echo ""
echo "📊 To view logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
