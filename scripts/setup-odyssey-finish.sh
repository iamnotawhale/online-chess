#!/bin/bash
# Дозавершить setup после сбоя на шаге 2 (Docker уже установлен).
set -euo pipefail

APP_DIR="/opt/online-chess"
APP_USER="${SUDO_USER:-nikita}"

if [ "$(id -u)" -ne 0 ]; then
    echo "sudo bash scripts/setup-odyssey-finish.sh"
    exit 1
fi

echo "[3/6] Caddy..."
CADDYFILE="/etc/caddy/Caddyfile"
SNIPPET="$APP_DIR/infra/caddy-onchess.caddyfile"
if [ -f "$SNIPPET" ] && ! grep -q "onchess.online" "$CADDYFILE" 2>/dev/null; then
    echo "" >> "$CADDYFILE"
    cat "$SNIPPET" >> "$CADDYFILE"
fi
caddy validate --config "$CADDYFILE"
systemctl reload caddy

echo "[4/6] Sudoers для deploy..."
SUDOERS="/etc/sudoers.d/onchess-deploy"
cat > "$SUDOERS" <<EOF
$APP_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload caddy, /usr/bin/caddy validate --config /etc/caddy/Caddyfile
EOF
chmod 440 "$SUDOERS"

echo "[5/6] Отключаем legacy сервисы..."
for svc in onchess-pg-tunnel onchess-pol-tunnel onchess-backend onchess-frontend; do
    sudo -u "$APP_USER" systemctl --user disable --now "$svc.service" 2>/dev/null || true
done

echo "[6/6] Готово. Дальше от пользователя nikita:"
echo "  sg docker -c 'cd /opt/online-chess && ./deploy-odyssey.sh'"
