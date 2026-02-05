#!/bin/bash
echo "Остановка бэкенда..."
if [ -f /tmp/backend.pid ]; then
    kill $(cat /tmp/backend.pid) 2>/dev/null
    rm /tmp/backend.pid
fi
lsof -ti:8082 | xargs -r kill 2>/dev/null
echo "Бэкенд остановлен"
