#!/bin/bash
# Однократный перенос БД с pol на локальный Docker Postgres на Odyssey.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/online-chess}"
POL_HOST="${POL_HOST:-144.31.102.74}"
DUMP="/tmp/chessonline.dump.gz"

cd "$APP_DIR"
source .env

echo "=== Миграция БД с pol -> Odyssey ==="

echo "Останавливаем legacy-туннели (освобождаем порт 5433)..."
systemctl --user disable --now onchess-pg-tunnel onchess-pol-tunnel onchess-backend onchess-frontend 2>/dev/null || true
sleep 1

echo "Дамп на pol..."
ssh -o StrictHostKeyChecking=accept-new "root@${POL_HOST}" bash -s <<'REMOTE'
set -e
cd /opt/online-chess
docker compose -f docker-compose.prod.yml up -d postgres
sleep 5
docker exec chess_postgres_prod pg_dump -U chess chessonline | gzip > /tmp/chessonline.dump.gz
REMOTE

echo "Копируем дамп..."
scp "root@${POL_HOST}:/tmp/chessonline.dump.gz" "$DUMP"

echo "Поднимаем Postgres на Odyssey..."
docker compose -f docker-compose.odyssey.yml up -d postgres
until docker exec chess_postgres_prod pg_isready -U chess -d chessonline >/dev/null 2>&1; do
    sleep 2
done

echo "Восстанавливаем..."
gunzip -c "$DUMP" | docker exec -i chess_postgres_prod psql -U chess -d chessonline

echo "Миграции..."
./db/apply-migrations.sh

echo "Готово. Проверка:"
docker exec chess_postgres_prod psql -U chess -d chessonline -c "SELECT count(*) AS users FROM users;"
