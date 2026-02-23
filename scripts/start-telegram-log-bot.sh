#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="/tmp/chess_telegram_log_bot.pid"
LOG_FILE="/tmp/chess_telegram_log_bot.log"

cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "❌ .env not found"
  exit 1
fi

set -a
source .env
set +a

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
  echo "⚠️ TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set, skipping bot start"
  exit 0
fi

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "ℹ️ Telegram log bot already running (PID $(cat "$PID_FILE"))"
  exit 0
fi

echo "🚀 Starting Telegram log bot..."
nohup python3 "$ROOT_DIR/scripts/telegram_log_bot.py" >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
echo "✅ Telegram log bot started (PID $(cat "$PID_FILE"))"
echo "📝 Log file: $LOG_FILE"
