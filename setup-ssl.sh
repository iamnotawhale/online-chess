#!/bin/bash
set -e

if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

source .env

echo "🔐 Setting up SSL certificate for $DOMAIN..."

# Create directories
mkdir -p certbot/conf
mkdir -p certbot/www

# Get certificate
docker run -it --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email your-email@example.com \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

echo "✅ SSL certificate obtained!"
echo "🔄 Restart nginx to apply: docker-compose -f docker-compose.prod.yml restart nginx"
