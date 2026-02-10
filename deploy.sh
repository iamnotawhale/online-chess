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

# Replace domain in nginx.conf
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" nginx.conf

# Pull latest code
echo "📥 Pulling latest code..."
git fetch origin
git checkout main
git reset --hard origin/main

# Apply database migrations
echo "💾 Applying database migrations..."
./db/apply-migrations.sh

# Stop existing containers
echo "⏹️  Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Build and start containers
echo "🔨 Building and starting containers..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose -f docker-compose.prod.yml ps

echo "✅ Deployment complete!"
echo "📱 Frontend: https://$DOMAIN"
echo "🔧 Backend: https://$DOMAIN/api"
echo ""
echo "📊 To view logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
