#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://onchess.online}"
INVITE_ID="${2:-TKFZJ5I}"
GAME_ID="${3:-9xxlCX5ynI}"
PUZZLE_ID="${4:-4YKlG}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CHECK_SCRIPT="$SCRIPT_DIR/check_preview_prod.sh"

if [[ ! -x "$CHECK_SCRIPT" ]]; then
  echo "Error: $CHECK_SCRIPT is missing or not executable"
  echo "Run: chmod +x $CHECK_SCRIPT"
  exit 1
fi

echo "== Batch preview check =="
echo "base:   $BASE_URL"
echo "invite: $INVITE_ID"
echo "game:   $GAME_ID"
echo "puzzle: $PUZZLE_ID"
echo

run_check() {
  local type="$1"
  local id="$2"
  echo "############################################################"
  echo "# $type / $id"
  echo "############################################################"
  "$CHECK_SCRIPT" "$BASE_URL" "$type" "$id" || true
  echo
}

run_check invite "$INVITE_ID"
run_check game "$GAME_ID"
run_check puzzle "$PUZZLE_ID"

echo "Batch check completed."
