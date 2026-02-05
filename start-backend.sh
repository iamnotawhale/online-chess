#!/bin/bash
cd "$(dirname "$0")/backend"
echo "Запуск бэкенда..."
mvn spring-boot:run > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/backend.pid
echo "Бэкенд запущен с PID: $BACKEND_PID"
echo "Ожидание запуска..."

# Проверка запуска (до 30 секунд)
for i in {1..30}; do
  sleep 1
  if curl -s http://localhost:8082/actuator/health >/dev/null 2>&1; then
    echo "✓ Бэкенд успешно запущен на порту 8082"
    exit 0
  fi
done

echo "✗ Бэкенд не запустился за 30 секунд. Проверьте логи: tail -f /tmp/backend.log"
exit 1
