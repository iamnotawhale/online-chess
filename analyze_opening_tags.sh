#!/bin/bash

# Распаковка и анализ OpeningTags из lichess_db_puzzle.csv.zst

FILE="./puzzles/lichess_db_puzzle.csv.zst"

if [ ! -f "$FILE" ]; then
    echo "❌ Файл не найден: $FILE"
    echo "Убедись, что файл расположен в ./puzzles/lichess_db_puzzle.csv.zst"
    exit 1
fi

echo "📊 Анализ OpeningTags из $FILE..."
echo ""

# Распаковать и извлечь уникальные теги с частотностью
zstd -d -c "$FILE" 2>/dev/null | \
    tail -n +2 | \
    cut -d',' -f8 | \
    grep -v '^$' | \
    tr ' ' '\n' | \
    sort | uniq -c | sort -rn | head -50

echo ""
echo "✅ Анализ завершён!"
echo ""
echo "Для полного списка выполни:"
echo "zstd -d -c ./puzzles/lichess_db_puzzle.csv.zst | tail -n +2 | cut -d',' -f8 | tr ' ' '\n' | sort -u"
