#!/bin/bash
set -euo pipefail

PID_FILE="/tmp/chess_telegram_log_bot.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "ℹ️ Telegram log bot is not running"
  exit 0
fi

PID="$(cat "$PID_FILE")"
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  echo "✅ Telegram log bot stopped (PID $PID)"
else
  echo "ℹ️ Process $PID is not running"
fi

rm -f "$PID_FILE"
