# OnChess на Odyssey — автономный деплой

OnChess работает **только на Odyssey**: Docker (postgres + backend + frontend) + Caddy.  
Деплой при push в `main` через GitHub Actions.

## 1. Однократная настройка на Odyssey

```bash
# На Odyssey (локально или ssh odyssey)
cd /tmp
git clone https://github.com/iamnotawhale/online-chess.git
cd online-chess
sudo bash scripts/setup-odyssey-server.sh
```

После скрипта **перелогиньтесь** (чтобы применилась группа `docker`).

### .env

```bash
sudo cp /opt/online-chess/.env.example /opt/online-chess/.env
sudo nano /opt/online-chess/.env
sudo chown nikita:nikita /opt/online-chess/.env
```

Пример (пароли сгенерируйте свои или возьмите с pol):

```env
DOMAIN=onchess.online
FRONTEND_URL=https://onchess.online
BACKEND_URL=https://onchess.online/api
DB_PASSWORD=...
JWT_SECRET=...   # openssl rand -base64 64
PUZZLE_MAX_LOAD=250000
```

### Puzzles (~274 MB)

```bash
scp pol:/opt/online-chess/puzzles/lichess_db_puzzle.csv.zst /opt/online-chess/puzzles/
```

### БД (перенос с pol, один раз)

```bash
cd /opt/online-chess
bash scripts/migrate-db-from-pol.sh
```

### DNS и роутер

| Запись | Значение |
|--------|----------|
| `onchess.online` A | домашний IP (например `188.243.16.106`) |
| `www.onchess.online` A | тот же IP |

Роутер: проброс **80** и **443** на `192.168.1.38`.

### Первый деплой вручную

```bash
cd /opt/online-chess
./deploy-odyssey.sh
curl -H "Host: onchess.online" http://127.0.0.1/api/health
```

### Отключить старую схему через pol

```bash
bash scripts/stop-pol-proxy.sh
systemctl --user disable --now onchess-pg-tunnel onchess-pol-tunnel onchess-backend onchess-frontend
```

---

## 2. GitHub Actions

Workflow: `.github/workflows/deploy.yml` — срабатывает на push в `main`.

### Secrets (Settings → Secrets → Actions)

| Secret | Значение |
|--------|----------|
| `SSH_PRIVATE_KEY` | приватный ключ для SSH на Odyssey |
| `SERVER_HOST` | `predicts.duckdns.org` или домашний IP |
| `SERVER_PORT` | `2222` (проброс SSH на роутере) |
| `SERVER_USER` | `nikita` |
| `ENV_FILE` | полное содержимое `.env` (многострочный secret) |

### SSH-ключ для деплоя

На Odyssey:

```bash
# публичный ключ из GitHub Actions добавить в ~/.ssh/authorized_keys
```

На GitHub: приватный ключ в `SSH_PRIVATE_KEY`.

---

## 3. Проверка после деплоя

```bash
curl https://onchess.online/api/health
# Регистрация / логин в браузере
```

---

## Архитектура

```
Internet → Router (80/443) → Odyssey Caddy → frontend :3000
                                          → backend  :8082 → postgres :5433 (Docker)
```

Predicts (`predicts.duckdns.org`) не затрагивается — отдельный блок в Caddyfile.
