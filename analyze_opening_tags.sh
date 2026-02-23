#!/bin/bash

# Decompress and analyze OpeningTags from lichess_db_puzzle.csv.zst

FILE="./puzzles/lichess_db_puzzle.csv.zst"

if [ ! -f "$FILE" ]; then
    echo "❌ File not found: $FILE"
    echo "Make sure the file exists at ./puzzles/lichess_db_puzzle.csv.zst"
    exit 1
fi

echo "📊 Analyzing OpeningTags from $FILE..."
echo ""

# Decompress and extract unique tags with frequencies
zstd -d -c "$FILE" 2>/dev/null | \
    tail -n +2 | \
    cut -d',' -f8 | \
    grep -v '^$' | \
    tr ' ' '\n' | \
    sort | uniq -c | sort -rn | head -50

echo ""
echo "✅ Analysis completed!"
echo ""
echo "For the full list run:"
echo "zstd -d -c ./puzzles/lichess_db_puzzle.csv.zst | tail -n +2 | cut -d',' -f8 | tr ' ' '\n' | sort -u"
