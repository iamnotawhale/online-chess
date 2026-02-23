#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://onchess.online}"
TYPE="${2:-puzzle}"       # invite | game | puzzle
ID="${3:-4YKlG}"
UA="TelegramBot (like TwitterBot)"
OUT_DIR="/tmp/chess-preview-check"

mkdir -p "$OUT_DIR"

META_URL="$BASE_URL/api/meta/$TYPE/$ID"
IMG_URL="$BASE_URL/api/meta/image/$TYPE/$ID.png"
TS="$(date +%s)"
IMG_URL_BUST="$IMG_URL?cb=$TS"

echo "== Preview check =="
echo "base: $BASE_URL"
echo "type: $TYPE"
echo "id:   $ID"
echo

echo "[1/4] Meta tags (as Telegram bot)"
curl -sA "$UA" "$META_URL" | grep -Eo '<meta property="og:(title|description|image)" content="[^"]+"' || true
echo

echo "[2/4] Image headers (no cache-bust)"
curl -sI -A "$UA" "$IMG_URL" | sed -n '1,20p'
echo

echo "[3/4] Image headers (with cache-bust)"
curl -sI -A "$UA" "$IMG_URL_BUST" | sed -n '1,20p'
echo

echo "[4/4] Binary compare"
A="$OUT_DIR/${TYPE}_${ID}_nobust.png"
B="$OUT_DIR/${TYPE}_${ID}_bust.png"
curl -sA "$UA" "$IMG_URL" -o "$A"
curl -sA "$UA" "$IMG_URL_BUST" -o "$B"

file "$A" "$B"
HASH_A="$(sha256sum "$A" | awk '{print $1}')"
HASH_B="$(sha256sum "$B" | awk '{print $1}')"

echo "hash(no-bust):  $HASH_A"
echo "hash(cache-b):  $HASH_B"

echo
if [[ "$HASH_A" == "$HASH_B" ]]; then
  echo "RESULT: SAME IMAGE -> likely server-side/data issue (not Telegram cache)."
else
  echo "RESULT: DIFFERENT IMAGE -> likely cache effect (Telegram may show stale preview)."
fi

echo
printf "saved files:\n- %s\n- %s\n" "$A" "$B"
