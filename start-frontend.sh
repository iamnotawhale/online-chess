#!/bin/bash
cd "$(dirname "$0")/frontend"
echo "Starting frontend..."
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/frontend.pid
echo "Frontend started with PID: $FRONTEND_PID"
echo "Waiting for startup..."

# Startup check (up to 15 seconds)
for i in {1..15}; do
  sleep 1
  if lsof -ti:5173 >/dev/null 2>&1; then
    echo "✓ Frontend started successfully on port 5173"
    exit 0
  fi
done

echo "✗ Frontend did not start within 15 seconds. Check logs: tail -f /tmp/frontend.log"
exit 1
