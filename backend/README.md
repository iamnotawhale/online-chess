# ChessOnline Backend

## Требования
- Java 21
- Maven 3.9+
- Запущенные Postgres и Redis (см. infra)

## Запуск

```bash
cd backend
mvn spring-boot:run
```

## Проверка

- Health: http://localhost:8080/api/health
- Actuator: http://localhost:8080/actuator/health

## Переменные окружения

Используются из `application.yml`:

- `POSTGRES_PORT` (по умолчанию 5433)
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DB_URL` (если нужен полный JDBC URL)
- `REDIS_HOST` (по умолчанию localhost)
- `REDIS_PORT` (по умолчанию 6379)
