#!/bin/bash
set -e

# Import puzzles from lichess_db_puzzle.csv.zst into DB
# By default imports 200000 rows. You can pass a custom limit as the first argument.

LIMIT=${1:-200000}
CSV_PATH="/home/nikita/Desktop/play code/online-chess/puzzles/lichess_db_puzzle.csv.zst"

if [ ! -f "$CSV_PATH" ]; then
  echo "❌ File not found: $CSV_PATH"
  exit 1
fi

# Auto-detect postgres container name
if docker ps --format '{{.Names}}' | grep -q "chess_postgres_prod"; then
  POSTGRES_CONTAINER="chess_postgres_prod"
elif docker ps --format '{{.Names}}' | grep -q "chess_postgres"; then
  POSTGRES_CONTAINER="chess_postgres"
else
  echo "❌ PostgreSQL container not found!"
  exit 1
fi

TS=$(date "+%Y-%m-%d %H:%M:%S")

echo "📦 Using container: $POSTGRES_CONTAINER"
echo "📊 Row limit: $LIMIT"

# Create staging table
cat <<'SQL' | docker exec -i "$POSTGRES_CONTAINER" psql -U chess -d chessonline -v ON_ERROR_STOP=1
CREATE TABLE IF NOT EXISTS puzzles_import (
  id VARCHAR(10),
  fen TEXT,
  moves TEXT,
  rating INTEGER,
  rating_deviation INTEGER,
  themes TEXT,
  opening_tags TEXT,
  fetched_at TIMESTAMP
);
SQL

# Import data into staging
echo "⏬ Importing into staging..."

if command -v zstdcat >/dev/null 2>&1; then
  DECOMPRESS_CMD="zstdcat"
else
  DECOMPRESS_CMD="zstd -d -c"
fi

$DECOMPRESS_CMD "$CSV_PATH" \
  | tail -n +2 \
  | head -n "$LIMIT" \
  | awk -F',' -v ts="$TS" 'BEGIN{OFS=","} NF>=10 {print $1,$2,$3,$4,$5,$8,$10,"\""ts"\""}' \
  | docker exec -i "$POSTGRES_CONTAINER" psql -U chess -d chessonline -v ON_ERROR_STOP=1 -c "\copy puzzles_import (id,fen,moves,rating,rating_deviation,themes,opening_tags,fetched_at) FROM STDIN WITH (FORMAT csv)"

# Insert into main table
echo "✅ Moving rows into puzzles..."
docker exec -i "$POSTGRES_CONTAINER" psql -U chess -d chessonline -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO puzzles (id, fen, moves, rating, rating_deviation, themes, opening_tags, fetched_at)
SELECT id, fen, moves, rating, rating_deviation, themes, opening_tags, fetched_at
FROM puzzles_import
ON CONFLICT (id) DO NOTHING;

TRUNCATE TABLE puzzles_import;
SQL

echo "✨ Import completed"
