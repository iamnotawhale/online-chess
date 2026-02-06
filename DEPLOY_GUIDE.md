# 🚀 Пошаговая инструкция по деплою онлайн-шахмат на onchess.online

## Шаг 1: Подготовка сервера

### 1.1 Подключитесь к серверу
```bash
ssh root@YOUR_SERVER_IP
```

### 1.2 Установите Docker и Docker Compose
```bash
# Обновите систему
apt update && apt upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установите Docker Compose
apt install docker-compose-plugin -y

# Проверьте установку
docker --version
docker compose version
```

### 1.3 Настройте DNS
В панели управления вашего регистратора доменов создайте A-запись:
- Тип: A
- Имя: @ (или оставьте пустым для корневого домена)
- Значение: IP-адрес вашего сервера
- TTL: 3600 (или значение по умолчанию)

Опционально для www:
- Тип: A
- Имя: www
- Значение: IP-адрес вашего сервера

Подождите 5-60 минут для распространения DNS.

---

## Шаг 2: Клонирование и настройка проекта

### 2.1 Клонируйте репозиторий
```bash
cd /opt
git clone https://github.com/iamnotawhale/online-chess.git
cd online-chess
```

### 2.2 Создайте .env файл
```bash
# Скопируйте пример
cp .env.example .env

# Сгенерируйте безопасные пароли
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)

# Создайте .env файл
cat > .env << EOF
# Domain configuration
DOMAIN=onchess.online

# Database
DB_PASSWORD=$DB_PASSWORD

# JWT Secret
JWT_SECRET=$JWT_SECRET

# URLs
FRONTEND_URL=https://onchess.online
BACKEND_URL=https://onchess.online/api
EOF

# Покажите пароли (сохраните их в безопасном месте!)
echo "🔐 Your credentials:"
echo "DB_PASSWORD: $DB_PASSWORD"
echo "JWT_SECRET: $JWT_SECRET"
```

### 2.3 Обновите nginx.conf
```bash
sed -i "s/YOUR_DOMAIN/onchess.online/g" nginx.conf
```

---

## Шаг 3: Первый запуск (без SSL)

### 3.1 Добавьте nginx сервис в docker-compose.prod.yml
Проверьте, что в файле есть nginx сервис. Если нет, он будет добавлен автоматически.

### 3.2 Запустите контейнеры
```bash
# Сначала запускаем без SSL для получения сертификата
docker compose -f docker-compose.prod.yml up -d postgres backend frontend

# Проверьте статус
docker compose -f docker-compose.prod.yml ps

# Посмотрите логи
docker compose -f docker-compose.prod.yml logs -f
```

Нажмите Ctrl+C чтобы выйти из логов.

---

## Шаг 4: Настройка SSL с Let's Encrypt

### 4.1 Установите Certbot
```bash
apt install certbot -y
```

### 4.2 Получите SSL сертификат
```bash
# Остановите nginx если он запущен
docker compose -f docker-compose.prod.yml stop nginx 2>/dev/null || true

# Получите сертификат
certbot certonly --standalone -d onchess.online -d www.onchess.online \
  --non-interactive --agree-tos --email your-email@example.com

# Замените your-email@example.com на ваш реальный email
```

### 4.3 Настройте автообновление сертификата
```bash
# Создайте cron задачу
cat > /etc/cron.d/certbot-renew << 'EOF'
0 3 * * * root certbot renew --quiet --post-hook "docker compose -f /opt/online-chess/docker-compose.prod.yml restart nginx"
EOF

chmod 644 /etc/cron.d/certbot-renew
```

---

## Шаг 5: Полный запуск с nginx

### 5.1 Обновите docker-compose.prod.yml
Убедитесь, что nginx сервис использует полученные сертификаты.

### 5.2 Запустите все сервисы
```bash
cd /opt/online-chess
docker compose -f docker-compose.prod.yml up -d --build

# Проверьте статус
docker compose -f docker-compose.prod.yml ps

# Посмотрите логи
docker compose -f docker-compose.prod.yml logs -f nginx
```

---

## Шаг 6: Проверка

### 6.1 Откройте в браузере
- https://onchess.online - должна открыться главная страница
- https://onchess.online/api/health - должен вернуть статус сервера

### 6.2 Проверьте логи
```bash
# Логи фронтенда
docker compose -f docker-compose.prod.yml logs -f frontend

# Логи бэкенда
docker compose -f docker-compose.prod.yml logs -f backend

# Логи базы данных
docker compose -f docker-compose.prod.yml logs -f postgres

# Логи nginx
docker compose -f docker-compose.prod.yml logs -f nginx
```

---

## Шаг 7: Настройка автоматического обновления

### 7.1 Создайте скрипт обновления
Файл `deploy.sh` уже создан. Сделайте его исполняемым:
```bash
chmod +x deploy.sh
```

### 7.2 Обновление приложения
```bash
cd /opt/online-chess
./deploy.sh
```

---

## Полезные команды

### Управление контейнерами
```bash
cd /opt/online-chess

# Остановить все сервисы
docker compose -f docker-compose.prod.yml down

# Запустить сервисы
docker compose -f docker-compose.prod.yml up -d

# Перезапустить сервис
docker compose -f docker-compose.prod.yml restart backend

# Пересобрать и запустить
docker compose -f docker-compose.prod.yml up -d --build

# Просмотр логов
docker compose -f docker-compose.prod.yml logs -f [service_name]

# Список контейнеров
docker ps
```

### Бэкап базы данных
```bash
# Создать бэкап
docker exec chess_postgres_prod pg_dump -U chess chessonline > backup_$(date +%Y%m%d).sql

# Восстановить из бэкапа
cat backup_20260207.sql | docker exec -i chess_postgres_prod psql -U chess chessonline
```

### Мониторинг
```bash
# Использование ресурсов
docker stats

# Проверка здоровья
curl https://onchess.online/api/health

# Логи nginx
docker compose -f docker-compose.prod.yml logs -f nginx
```

---

## Troubleshooting

### Проблема: Сайт не открывается

**Решение:**
1. Проверьте DNS: `nslookup onchess.online`
2. Проверьте firewall: 
   ```bash
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw allow 22/tcp
   ufw enable
   ```
3. Проверьте статус контейнеров: `docker ps`
4. Посмотрите логи nginx: `docker compose -f docker-compose.prod.yml logs nginx`

### Проблема: Backend не отвечает

**Решение:**
1. Проверьте логи: `docker compose -f docker-compose.prod.yml logs backend`
2. Проверьте подключение к БД: `docker compose -f docker-compose.prod.yml logs postgres`
3. Перезапустите: `docker compose -f docker-compose.prod.yml restart backend`

### Проблема: SSL сертификат не работает

**Решение:**
1. Проверьте, что DNS настроен правильно
2. Попробуйте получить сертификат заново:
   ```bash
   certbot delete --cert-name onchess.online
   certbot certonly --standalone -d onchess.online -d www.onchess.online
   ```
3. Перезапустите nginx: `docker compose -f docker-compose.prod.yml restart nginx`

---

## Безопасность

### Рекомендации:
1. **Firewall**: Откройте только необходимые порты (22, 80, 443)
2. **SSH**: Используйте ключи вместо паролей
3. **Обновления**: Регулярно обновляйте систему
4. **Бэкапы**: Настройте автоматическое резервное копирование БД
5. **Мониторинг**: Используйте инструменты мониторинга (например, Grafana)

### Настройка firewall:
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

---

## Поддержка

Если возникли проблемы:
1. Проверьте логи всех сервисов
2. Убедитесь, что DNS настроен правильно
3. Проверьте, что все переменные окружения в .env заполнены
4. Откройте issue на GitHub: https://github.com/iamnotawhale/online-chess/issues

Удачи с деплоем! 🚀
