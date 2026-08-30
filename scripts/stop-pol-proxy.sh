#!/bin/bash
# Остановить прокси OnChess на pol (после перехода на Odyssey).
set -euo pipefail

POL_HOST="${POL_HOST:-144.31.102.74}"

ssh "root@${POL_HOST}" bash -s <<'REMOTE'
cd /opt/online-chess 2>/dev/null || exit 0
docker compose -f docker-compose.pol-proxy.yml down 2>/dev/null || true
docker rm -f chess_nginx_proxy 2>/dev/null || true
echo "Pol proxy stopped. Postgres on pol can stay for backup or:"
echo "  docker compose -f docker-compose.prod.yml down"
REMOTE

echo "На Odyssey отключите туннели:"
echo "  systemctl --user disable --now onchess-pg-tunnel onchess-pol-tunnel onchess-backend onchess-frontend"
