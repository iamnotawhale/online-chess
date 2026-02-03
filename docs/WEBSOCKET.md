# WebSocket API

## Подключение

```
wss://chessonline.app/ws?token=<JWT>
```

После подключения клиент подписывается на:
- `/topic/game/{gameId}` — события игры
- `/user/queue/notifications` — личные уведомления (матчмейкинг и т.д.)

---

## События (Client → Server)

### move
Отправка хода

```json
{
  "event": "move",
  "gameId": "game-123",
  "from": "e2",
  "to": "e4",
  "promotion": null
}
```

**Валидация:**
- Проверяется легальность хода
- Проверяется очередь игрока
- Обновляется таймер

### resign
Сдаться

```json
{
  "event": "resign",
  "gameId": "game-123"
}
```

### drawOffer
Предложить ничью

```json
{
  "event": "drawOffer",
  "gameId": "game-123"
}
```

### drawResponse
Ответ на предложение ничьи

```json
{
  "event": "drawResponse",
  "gameId": "game-123",
  "accept": true
}
```

### chatMessage
Сообщение в чате

```json
{
  "event": "chatMessage",
  "gameId": "game-123",
  "text": "Good game!"
}
```

### emoji
Отправка эмодзи-реакции

```json
{
  "event": "emoji",
  "gameId": "game-123",
  "emoji": "👍"
}
```

---

## События (Server → Client)

### move
Подтверждение хода

```json
{
  "event": "move",
  "gameId": "game-123",
  "moveNumber": 1,
  "san": "e4",
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "player": "white",
  "timeLeftMs": 298000,
  "timestamp": "2026-02-04T10:21:00Z"
}
```

### timerTick
Обновление таймера (каждую секунду)

```json
{
  "event": "timerTick",
  "gameId": "game-123",
  "whiteTimeMs": 287000,
  "blackTimeMs": 300000
}
```

### gameOver
Завершение игры

```json
{
  "event": "gameOver",
  "gameId": "game-123",
  "result": "white_win",
  "reason": "checkmate",
  "pgn": "1. e4 e5 2. Nf3 ...",
  "ratingChanges": {
    "white": {
      "before": 1200,
      "after": 1215,
      "change": +15
    },
    "black": {
      "before": 1250,
      "after": 1235,
      "change": -15
    }
  }
}
```

**Причины завершения:**
- `checkmate` — мат
- `resignation` — сдача
- `timeout` — флаг (время истекло)
- `stalemate` — пат
- `draw_agreement` — ничья по соглашению
- `insufficient_material` — недостаточно материала
- `threefold_repetition` — троекратное повторение
- `fifty_move_rule` — правило 50 ходов

### drawOffer
Предложение ничьи от противника

```json
{
  "event": "drawOffer",
  "gameId": "game-123",
  "from": "white"
}
```

### chatMessage
Сообщение в чате

```json
{
  "event": "chatMessage",
  "gameId": "game-123",
  "user": "neo",
  "text": "Good game!",
  "timestamp": "2026-02-04T10:25:00Z"
}
```

### emoji
Эмодзи-реакция

```json
{
  "event": "emoji",
  "gameId": "game-123",
  "user": "trinity",
  "emoji": "👍",
  "timestamp": "2026-02-04T10:25:30Z"
}
```

### matchFound
Игра найдена (после матчмейкинга)

```json
{
  "event": "matchFound",
  "gameId": "game-456",
  "opponent": {
    "username": "trinity",
    "rating": 1250
  },
  "yourColor": "white",
  "timeControl": {
    "type": "blitz",
    "minutes": 5,
    "incrementSec": 3
  }
}
```

### reconnected
Переподключение к игре

```json
{
  "event": "reconnected",
  "gameId": "game-123",
  "currentState": {
    "fen": "...",
    "whiteTimeMs": 245000,
    "blackTimeMs": 290000,
    "turnColor": "black",
    "moveHistory": [...]
  }
}
```

### opponentDisconnected
Противник отключился

```json
{
  "event": "opponentDisconnected",
  "gameId": "game-123",
  "gracePeriodSec": 60
}
```

### opponentReconnected
Противник переподключился

```json
{
  "event": "opponentReconnected",
  "gameId": "game-123"
}
```

---

## Ошибки

```json
{
  "event": "error",
  "code": "ILLEGAL_MOVE",
  "message": "Move e2e5 is not legal in current position",
  "gameId": "game-123"
}
```

**Коды ошибок:**
- `ILLEGAL_MOVE` — невалидный ход
- `NOT_YOUR_TURN` — не ваша очередь
- `GAME_NOT_FOUND` — игра не найдена
- `GAME_FINISHED` — игра уже завершена
- `UNAUTHORIZED` — нет авторизации

---

## Переподключение

При обрыве соединения:
1. Клиент переподключается с тем же JWT
2. Сервер отправляет событие `reconnected` с текущим состоянием
3. Таймер синхронизируется
4. Игра продолжается

Если игрок не переподключился в течение 60 секунд — засчитывается поражение по времени.
