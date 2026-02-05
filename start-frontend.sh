#!/bin/bash
cd "$(dirname "$0")/frontend"
echo "Запуск фронтенда..."
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/frontend.pid
echo "Фронтенд запущен с PID: $FRONTEND_PID"
echo "Ожидание запуска..."

# Проверка запуска (до 15 секунд)
for i in {1..15}; do
  sleep 1
  if lsof -ti:5173 >/dev/null 2>&1; then
    echo "✓ Фронтенд успешно запущен на порту 5173"
    exit 0
  fi
done

echo "✗ Фронтенд не запустился за 15 секунд. Проверьте логи: tail -f /tmp/frontend.log"
exit 1
