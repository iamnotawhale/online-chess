#!/bin/bash
set -e

CADDYFILE="/etc/caddy/Caddyfile"
SNIPPET="$(cd "$(dirname "$0")/.." && pwd)/infra/caddy-onchess.caddyfile"

if [ ! -f "$SNIPPET" ]; then
    echo "Missing $SNIPPET"
    exit 1
fi

if grep -q "onchess.online" "$CADDYFILE" 2>/dev/null; then
    echo "onchess.online block already present in $CADDYFILE"
else
    echo "Appending onchess.online block to $CADDYFILE"
    echo "" | sudo tee -a "$CADDYFILE" >/dev/null
    sudo tee -a "$CADDYFILE" < "$SNIPPET" >/dev/null
fi

sudo caddy validate --config "$CADDYFILE"
sudo systemctl reload caddy
echo "Caddy configured for onchess.online"
