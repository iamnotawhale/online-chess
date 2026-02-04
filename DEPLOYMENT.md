# 🚀 Деплой Chess Online на сервер

## Требования

- Ubuntu/Debian сервер с root доступом
- Docker и Docker Compose
- Доменное имя, указывающее на IP сервера

## Быстрый старт

### 1. Установка Docker (если не установлен)

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавить пользователя в группу docker
sudo usermod -aG docker $USER

# Установить Docker Compose
sudo apt install docker-compose-plugin -y

# Перелогиниться
exit
```

### 2. Клонировать репозиторий

```bash
cd /opt
sudo git clone https://github.com/iamnotawhale/online-chess.git
sudo chown -R $USER:$USER online-chess
cd online-chess
```

### 3. Настроить переменные окружения

```bash
# Скопировать пример конфигурации
cp .env.example .env

# Сгенерировать безопасные значения
echo "DB_PASSWORD=$(openssl rand -base64 32)" >> .env
echo "JWT_SECRET=$(openssl rand -base64 64)" >> .env

# Отредактировать .env и указать свой домен
nano .env
```

Пример `.env`:
```
DB_PASSWORD=generated_password_here
JWT_SECRET=generated_jwt_secret_here
FRONTEND_URL=https://chess.yourdomain.com
BACKEND_URL=https://chess.yourdomain.com/api
DOMAIN=chess.yourdomain.com
```

### 4. Настроить DNS

Добавьте A-запись для вашего домена, указывающую на IP сервера:
```
A    chess.yourdomain.com    →    YOUR_SERVER_IP
```

### 5. Запустить приложение (без SSL)

```bash
# Сделать скрипты исполняемыми
chmod +x deploy.sh setup-ssl.sh

# Временно отключить SSL в nginx.conf (закомментировать ssl секцию)
# Или использовать базовую версию без SSL для тестирования

# Запустить
./deploy.sh
```

### 6. Настроить SSL сертификат

```bash
# Получить SSL сертификат (замените email)
./setup-ssl.sh

# Перезапустить nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

## Управление

### Просмотр логов
```bash
# Все сервисы
docker-compose -f docker-compose.prod.yml logs -f

# Конкретный сервис
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Перезапуск
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Остановка
```bash
docker-compose -f docker-compose.prod.yml down
```

### Обновление
```bash
git pull
./deploy.sh
```

### Бэкап базы данных
```bash
docker exec chess_postgres_prod pg_dump -U chess chessonline > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Troubleshooting

### Проверка статуса контейнеров
```bash
docker-compose -f docker-compose.prod.yml ps
```

### Проверка портов
```bash
sudo netstat -tlnp | grep -E ':(80|443|8082|5432)'
```

### Проверка логов nginx
```bash
docker exec chess_nginx cat /var/log/nginx/error.log
```

### Проблемы с SSL
Если SSL не работает, проверьте:
1. DNS правильно настроен (ping chess.yourdomain.com)
2. Порты 80 и 443 открыты в файрволе
3. Certbot успешно получил сертификат

```bash
# Проверить сертификат
sudo docker run --rm -v $(pwd)/certbot/conf:/etc/letsencrypt certbot/certbot certificates

# Обновить сертификат
sudo docker run --rm -v $(pwd)/certbot/conf:/etc/letsencrypt -v $(pwd)/certbot/www:/var/www/certbot certbot/certbot renew
```

## Безопасность

1. **Firewall**: Оставьте открытыми только порты 22 (SSH), 80 (HTTP), 443 (HTTPS)
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

2. **Обновления**: Регулярно обновляйте систему
```bash
sudo apt update && sudo apt upgrade -y
```

3. **Мониторинг**: Настройте мониторинг (опционально)
```bash
# Установить monitoring stack (Prometheus + Grafana)
# или использовать внешние сервисы типа Uptimerobot
```

## Производительность

- Сервер с минимум **2 GB RAM** и **2 CPU cores**
- Для большей нагрузки рекомендуется **4 GB RAM**
- SSD диск для базы данных

## Контакты

При возникновении проблем проверьте Issues на GitHub или создайте новый.
