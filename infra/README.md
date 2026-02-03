# Инфраструктура

## Запуск

```bash
# Скопировать переменные окружения
cp .env.example .env

# Запустить сервисы
docker-compose up -d

# Проверить статус
docker-compose ps

# Логи
docker-compose logs -f postgres
docker-compose logs -f redis
```

## Остановка

```bash
docker-compose down

# С удалением данных
docker-compose down -v
```

## Подключение к БД

```bash
# Через psql
docker exec -it chess_postgres psql -U chess -d chessonline

# Через любой клиент
Host: localhost
Port: 5432
Database: chessonline
User: chess
Password: chesspass
```

## Redis CLI

```bash
docker exec -it chess_redis redis-cli
```

## Сброс БД

```bash
docker-compose down -v
docker-compose up -d
# Схема автоматически применится при первом запуске
```
