#!/bin/bash
# Однократная настройка Odyssey для OnChess (запускать на сервере).
# Часть команд требует sudo — скрипт попросит пароль.
set -euo pipefail

APP_DIR="/opt/online-chess"
APP_USER="${SUDO_USER:-nikita}"
REPO_URL="${REPO_URL:-https://github.com/iamnotawhale/online-chess.git}"

echo "=== OnChess: настройка Odyssey ==="
echo "Пользователь приложения: $APP_USER"
echo "Каталог: $APP_DIR"
echo ""

if [ "$(id -u)" -ne 0 ]; then
    echo "Запустите с sudo: sudo bash scripts/setup-odyssey-server.sh"
    exit 1
fi

echo "[1/6] Docker..."
if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | sh
fi
usermod -aG docker "$APP_USER"
systemctl enable docker
systemctl start docker

echo "[2/6] Каталог приложения..."
mkdir -p "$APP_DIR/puzzles"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
    echo "Клонируем репозиторий..."
    TMP=$(mktemp -d)
    sudo -u "$APP_USER" git clone "$REPO_URL" "$TMP"
    rsync -a "$TMP"/ "$APP_DIR"/
    rm -rf "$TMP"
    chown -R "$APP_USER:$APP_USER" "$APP_DIR"
else
    echo "Репозиторий уже есть в $APP_DIR"
fi

echo "[3/6] Caddy для onchess.online..."
CADDYFILE="/etc/caddy/Caddyfile"
SNIPPET="$APP_DIR/infra/caddy-onchess.caddyfile"
if [ -f "$SNIPPET" ] && ! grep -q "onchess.online" "$CADDYFILE" 2>/dev/null; then
    echo "" >> "$CADDYFILE"
    cat "$SNIPPET" >> "$CADDYFILE"
fi
caddy validate --config "$CADDYFILE"
systemctl reload caddy

echo "[4/6] Sudo без пароля для деплоя (reload Caddy)..."
SUDOERS="/etc/sudoers.d/onchess-deploy"
cat > "$SUDOERS" <<EOF
$APP_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload caddy, /usr/bin/caddy validate --config /etc/caddy/Caddyfile
EOF
chmod 440 "$SUDOERS"

echo "[5/6] Отключаем legacy systemd-сервисы (туннели на pol)..."
for svc in onchess-pg-tunnel onchess-pol-tunnel onchess-backend onchess-frontend; do
    sudo -u "$APP_USER" systemctl --user disable --now "$svc.service" 2>/dev/null || true
done

echo "[6/6] Готово. Осталось вручную:"
echo "  1. Создать $APP_DIR/.env (см. .env.example или скопировать с pol)"
echo "  2. Положить puzzles/lichess_db_puzzle.csv.zst в $APP_DIR/puzzles/"
echo "  3. (опционально) Импорт БД: bash scripts/migrate-db-from-pol.sh"
echo "  4. DNS: A-запись onchess.online -> ваш домашний IP (188.243.16.106)"
echo "  5. Роутер: проброс 80, 443 -> Odyssey"
echo "  6. GitHub Secrets: SSH_PRIVATE_KEY, SERVER_HOST, SERVER_PORT=2222, SERVER_USER=$APP_USER, ENV_FILE"
echo "  7. Первый деплой: cd $APP_DIR && ./deploy-odyssey.sh"
echo ""
echo "Перелогиньтесь в SSH-сессию (exit + ssh снова), чтобы группа docker применилась."
echo "Или проверьте: sg docker -c 'docker ps'"
