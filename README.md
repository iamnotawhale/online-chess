# ONCHESS ♟️

Современное веб-приложение для игры в шахматы онлайн с системой рейтингов, матчмейкингом и приглашениями по ссылке/QR, а также тренажером тактики.

## ✅ Промежуточные итоги (02.2026)

- Внедрена i18n (EN/RU) для всего интерфейса
- Унифицированы элементы управления матчмейкинга и кастомных партий
- Минималистичный UI, переработаны слайдеры и хедер
- Корректные статусы/причины завершения игры, переводы результатов
- Исправлены оставшиеся хардкод‑строки и бейджи статусов
- Социальные превью для /invite, /game, /puzzle (OG/Twitter + PNG)
- Улучшена устойчивость ссылок на пазлы и превью

## 📋 Возможности (MVP)

- ✅ Регистрация и авторизация (JWT)
- ✅ Личный профиль с рейтингом Elo и статистикой
- ✅ Матчмейкинг по рейтингу (±200 Elo)
- ✅ Приглашения по ссылке и QR-коду
- ✅ Онлайн-игра через WebSocket
- ✅ История партий с PGN
- ✅ Встроенный чат и эмодзи
- ✅ Таймеры (блиц, рапид, классика)
- ✅ Переключение языка интерфейса (EN/RU)
- ✅ Тренировка пазлов (daily/random/lesson) и шэринг
- ✅ Социальные превью (OG/Twitter) для ссылок

## 🏗️ Архитектура

```
/online-chess
  /frontend     # React + TypeScript + Vite
  /backend      # Spring Boot (Java 21) + WebSocket
  /infra        # Docker Compose (Postgres + Redis)
  /db           # SQL схемы
  /docs         # Документация API/WS
```

## 🚀 Быстрый старт

### 1. Клонировать репозиторий

```bash
git clone https://github.com/iamnotawhale/online-chess.git
cd online-chess
```

### 2. Запустить инфраструктуру

```bash
cd infra
cp .env.example .env
docker-compose up -d
```

Проверка:
```bash
docker-compose ps
# postgres: localhost:5432
# redis: localhost:6379
```

### 3. Проверить БД

```bash
docker exec -it chess_postgres psql -U chess -d chessonline
```

```sql
\dt  -- показать таблицы
SELECT * FROM users;
```

## 📚 Документация

- [API спецификация](docs/API.md) (REST endpoints)
- [WebSocket события](docs/WEBSOCKET.md)
- [Схема БД](db/schema.sql)
- [Архитектурный план](docs/ARCHITECTURE.md)

## 🛠️ Технологии

### Frontend
- React 18 + TypeScript + Vite
- chess.js (логика игры)
- react-chessboard (UI доски)
- WebSocket client (SockJS/STOMP)
- Встроенная i18n (EN/RU)

### Backend
- Spring Boot 3.2 (Java 21)
- Spring Security (JWT)
- Spring Data JPA (PostgreSQL)
- Spring WebSocket (STOMP)
- Redis (кэш, сессии)

### Инфраструктура
- PostgreSQL 16
- Redis 7
- SVG/PNG рендер превью для социальных карточек
- Docker Compose

## 🌐 Production (Odyssey)

Автономный деплой на домашний сервер Odyssey: Docker + Caddy + GitHub Actions.

**Полная инструкция:** [docs/ODYSSEY_SETUP.md](docs/ODYSSEY_SETUP.md)

Кратко на Odyssey (один раз):

```bash
git clone https://github.com/iamnotawhale/online-chess.git /tmp/online-chess
cd /tmp/online-chess
sudo bash scripts/setup-odyssey-server.sh
```

После push в `main` GitHub Actions запускает `deploy-odyssey.sh` на сервере.


### ✅ Этап 1: Инфраструктура
- [x] Docker Compose
- [x] Схема БД
- [x] CI/CD (GitHub Actions → Odyssey)

### ✅ Этап 2: Auth & Users
- [x] Регистрация/логин (JWT)
- [x] Профиль
- [ ] OAuth (Google, GitHub)

### ✅ Этап 3: Invites
- [x] Создание приглашений
- [x] QR генерация
- [x] Подключение по ссылке

### 🔄 Этап 4: Game Service
- [x] WebSocket события
- [x] Проверка ходов на сервере
- [x] PGN storage
- [x] Таймеры

### 🔄 Этап 5: Matchmaking
- [x] Очередь по рейтингу
- [x] Подбор соперника

### 🔄 Этап 6: Rating & History
- [x] Elo пересчет
- [x] История партий
- [ ] Лидерборды

### 🔄 Этап 7: Puzzles
- [x] Daily/Random пазлы
- [x] Lesson-пазлы по темам/открытиям
- [ ] Глобальные лидерборды по пазлам

## 🤝 Вклад

Пулл-реквесты приветствуются! Для больших изменений сначала откройте issue.

## 📄 Лицензия

MIT
