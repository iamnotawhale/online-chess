#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SYSTEMD_USER_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"

mkdir -p "$SYSTEMD_USER_DIR"
"$ROOT/scripts/generate-onchess-env.sh"

for unit in onchess-pg-tunnel onchess-backend onchess-frontend onchess-pol-tunnel; do
    cp "$ROOT/deploy/systemd/${unit}.service" "$SYSTEMD_USER_DIR/"
done

systemctl --user daemon-reload
systemctl --user enable onchess-pg-tunnel.service onchess-backend.service onchess-frontend.service onchess-pol-tunnel.service
systemctl --user restart onchess-pg-tunnel.service
sleep 3
systemctl --user restart onchess-backend.service onchess-frontend.service
sleep 5
systemctl --user restart onchess-pol-tunnel.service

echo "User services status:"
systemctl --user status onchess-pg-tunnel.service onchess-backend.service onchess-frontend.service --no-pager || true

echo ""
echo "Health check:"
curl -sf http://127.0.0.1:8082/api/health && echo || echo "Backend not ready yet"

echo ""
echo "If Caddy is not configured yet, run with sudo:"
echo "  sudo $ROOT/scripts/setup-odyssey-caddy.sh"
