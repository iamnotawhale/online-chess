#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
OUT="$ROOT/deploy/onchess.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Missing $ENV_FILE"
    exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

cat > "$OUT" <<EOF
SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:5433/chessonline
SPRING_DATASOURCE_USERNAME=chess
SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION_MS=${JWT_EXPIRATION_MS:-86400000}
FRONTEND_URL=${FRONTEND_URL}
APP_FRONTEND_URL=${FRONTEND_URL}
PUZZLE_CSV_PATH=${ROOT}/puzzles/lichess_db_puzzle.csv.zst
PUZZLE_MAX_LOAD=${PUZZLE_MAX_LOAD:-250000}
EOF

chmod 600 "$OUT"
echo "Wrote $OUT"
