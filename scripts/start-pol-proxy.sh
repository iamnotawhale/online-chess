#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

docker compose -f docker-compose.pol-proxy.yml up -d
docker compose -f docker-compose.pol-proxy.yml ps
echo "Pol proxy nginx started on 80/443 (requires Odyssey SSH reverse tunnel)"
