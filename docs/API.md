# REST API Спецификация

## Базовый URL
```
http://localhost:8080/api
```

## Аутентификация
Все защищённые endpoints требуют JWT токен в заголовке:
```
Authorization: Bearer <token>
```

---

## Auth

### POST /auth/register
Регистрация нового пользователя

**Request:**
```json
{
  "username": "neo",
  "email": "neo@mail.com",
  "password": "secret123"
}
```

**Response:** `201 Created`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "neo",
    "email": "neo@mail.com",
    "rating": 1200,
    "createdAt": "2026-02-04T10:00:00Z"
  }
}
```

### POST /auth/login
Вход в систему

**Request:**
```json
{
  "email": "neo@mail.com",
  "password": "secret123"
}
```

**Response:** `200 OK` (аналогично register)

---

## Users

### GET /users/me
Получить свой профиль (требует авторизации)

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "neo",
  "email": "neo@mail.com",
  "rating": 1200,
  "country": "RU",
  "bio": "Chess enthusiast",
  "avatarUrl": "https://example.com/avatar.jpg",
  "stats": {
    "wins": 10,
    "losses": 4,
    "draws": 2,
    "totalGames": 16
  },
  "createdAt": "2026-02-03T10:00:00Z"
}
```

### GET /users/{username}
Получить публичный профиль пользователя

**Response:** `200 OK` (без поля email)

### PATCH /users/me
Обновить свой профиль

**Request:**
```json
{
  "country": "RU",
  "bio": "Chess lover",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

**Response:** `200 OK` (обновлённый профиль)

---

## Invites

### POST /invites
Создать приглашение (требует авторизации)

**Request:**
```json
{
  "timeControl": "blitz",
  "minutes": 5,
  "incrementSec": 3
}
```

**Response:** `201 Created`
```json
{
  "inviteId": "abc-123-def",
  "code": "abc123",
  "inviteUrl": "http://localhost:3000/invite/abc123",
  "expiresAt": "2026-02-04T12:00:00Z"
}
```

### GET /invites/{code}
Проверить приглашение

**Response:** `200 OK`
```json
{
  "valid": true,
  "host": {
    "id": "550e8400-...",
    "username": "neo",
    "rating": 1200
  },
  "timeControl": {
    "type": "blitz",
    "minutes": 5,
    "incrementSec": 3
  }
}
```

### POST /invites/{code}/join
Подключиться к игре по приглашению (требует авторизации)

**Response:** `200 OK`
```json
{
  "gameId": "game-uuid-123",
  "wsToken": "short-lived-ws-token"
}
```

---

## Matchmaking

### POST /matchmaking/join
Войти в очередь поиска игры (требует авторизации)

**Request:**
```json
{
  "timeControl": "blitz",
  "minutes": 5,
  "incrementSec": 0
}
```

**Response:** `202 Accepted`
```json
{
  "status": "searching",
  "queuePosition": 3
}
```

### DELETE /matchmaking/leave
Выйти из очереди

**Response:** `204 No Content`

---

## Games

### GET /games/{id}
Получить информацию об игре

**Response:** `200 OK`
```json
{
  "id": "game-123",
  "players": {
    "white": {
      "id": "user-1",
      "username": "neo",
      "rating": 1200
    },
    "black": {
      "id": "user-2",
      "username": "trinity",
      "rating": 1250
    }
  },
  "status": "active",
  "result": null,
  "timeControl": {
    "type": "blitz",
    "minutes": 5,
    "incrementSec": 3
  },
  "createdAt": "2026-02-04T10:20:00Z"
}
```

### GET /games/{id}/moves
Получить список ходов

**Response:** `200 OK`
```json
{
  "gameId": "game-123",
  "moves": [
    {
      "moveNumber": 1,
      "san": "e4",
      "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      "timeLeftMs": 298000,
      "timestamp": "2026-02-04T10:21:00Z"
    }
  ]
}
```

### GET /games/history
История игр текущего пользователя (требует авторизации)

**Query params:**
- `page` (default: 1)
- `size` (default: 20)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "game-123",
      "opponent": {
        "username": "trinity",
        "rating": 1250
      },
      "myColor": "white",
      "result": "win",
      "timeControl": "blitz",
      "createdAt": "2026-02-04T10:20:00Z"
    }
  ],
  "total": 16,
  "page": 1,
  "size": 20
}
```

---

## Rating & Leaderboard

### GET /leaderboard
Глобальный лидерборд

**Query params:**
- `mode` (blitz, rapid, classical; default: all)
- `page` (default: 1)
- `size` (default: 50)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "rank": 1,
      "username": "neo",
      "rating": 1500,
      "wins": 30,
      "totalGames": 45
    }
  ],
  "page": 1,
  "size": 50
}
```

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Bad Request (невалидные данные) |
| 401 | Unauthorized (нет токена) |
| 403 | Forbidden (нет прав) |
| 404 | Not Found |
| 409 | Conflict (username/email занят) |
| 500 | Internal Server Error |

**Формат ошибки:**
```json
{
  "error": "INVITE_EXPIRED",
  "message": "Invite link has expired",
  "timestamp": "2026-02-04T10:30:00Z"
}
```
