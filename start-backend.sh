#!/bin/bash
cd "$(dirname "$0")/backend"
echo "Starting backend..."
mvn spring-boot:run > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/backend.pid
echo "Backend started with PID: $BACKEND_PID"
echo "Waiting for startup..."

# Startup check (up to 30 seconds)
for i in {1..30}; do
  sleep 1
  if curl -s http://localhost:8082/actuator/health >/dev/null 2>&1; then
    echo "✓ Backend started successfully on port 8082"
    exit 0
  fi
done

echo "✗ Backend did not start within 30 seconds. Check logs: tail -f /tmp/backend.log"
exit 1
