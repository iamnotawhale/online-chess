# Project Overview

This document summarizes the technologies used and the key files and folders across the application.

## Tech Stack

### Frontend
- React 18, TypeScript, Vite
- chess.js for game logic
- react-chessboard for board UI
- WebSocket client (SockJS/STOMP)
- In-app i18n (EN/RU)

### Backend
- Spring Boot 3.2 (Java 21)
- Spring Security (JWT)
- Spring Data JPA (PostgreSQL)
- Spring WebSocket (STOMP)
- Redis for cache and sessions
- Java2D + SVG for social preview rendering

### Infrastructure
- Docker / Docker Compose
- PostgreSQL 15/16
- Redis 7
- Nginx

## Repository Structure

```
/online-chess
  backend/              Spring Boot backend
  frontend/             React app
  infra/                Local Docker Compose (Postgres + Redis)
  db/                   SQL schema and migrations
  docs/                 Documentation
  puzzles/              Lichess puzzle dataset (.zst)
  scripts/              Utility scripts
  public/               Static assets
  nginx.conf            Production nginx config
  docker-compose.prod.yml  Production Compose stack
  deploy.sh             Deployment script for prod
```

## Key Backend Files

- backend/src/main/java/com/chessonline/ChessOnlineApplication.java
  Application entry point.

- backend/src/main/java/com/chessonline/controller
  REST and WebSocket controllers:
  - AuthController.java
  - GameController.java
  - GameWebSocketController.java
  - InviteController.java
  - LobbyController.java
  - MatchmakingController.java
  - PuzzleController.java
  - RatingController.java
  - UserController.java
  - MetaPreviewController.java (OG/Twitter meta + PNG previews)

- backend/src/main/java/com/chessonline/service
  Core domain services:
  - GameService.java
  - MatchmakingService.java
  - PuzzleService.java
  - RatingService.java

- backend/src/main/resources/application.yml
  Main configuration (ports, DB, Redis, puzzle load settings).

## Key Frontend Files

- frontend/src/main.tsx
  React entry point.

- frontend/src/App.tsx
  App routes and layout.

- frontend/src/api.ts
  API client wrapper.

- frontend/src/websocket.ts
  WebSocket client setup.

- frontend/src/components
  UI views and feature components, including:
  - Game.tsx
  - Lobby.tsx
  - Dashboard.tsx
  - InviteByLinkModal.tsx
  - PuzzleTraining.tsx

- frontend/src/i18n
  Language context and translations.

## Docs

- docs/API.md
  REST API endpoints.

- docs/WEBSOCKET.md
  WebSocket events and message formats.

- docs/ARCHITECTURE.md
  High-level architecture notes.

- docs/PROJECT_OVERVIEW.md
  This document.

## Scripts

- scripts/import_puzzles.sh
  Import puzzles from CSV into Postgres.

- scripts/check_preview_prod.sh
- scripts/check_preview_prod_all.sh
  Social preview diagnostic scripts.

- scripts/start-telegram-log-bot.sh
- scripts/stop-telegram-log-bot.sh
- scripts/telegram_log_bot.py
  Telegram log alert helper.

## Social Previews

- /api/meta/{type}/{id}
  HTML meta page for OG/Twitter cards.

- /api/meta/image/{type}/{id}.png
  PNG image renderer for social previews.

Types: invite, game, puzzle.

## Puzzles

- The Lichess puzzle dataset is stored in puzzles/lichess_db_puzzle.csv.zst.
- PuzzleService loads a configurable subset into memory for fast access.
- Lesson puzzles query Postgres (themes/opening tags) when available.

## Deployment

- docker-compose.prod.yml defines the production stack.
- deploy.sh pulls, builds, and restarts services.
- .env stores secrets and deploy-time settings.
