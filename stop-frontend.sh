#!/bin/bash
echo "Остановка фронтенда..."
lsof -ti:5173 | xargs -r kill 2>/dev/null
echo "Фронтенд остановлен"
