# Инструкция по деплою обновлений на сервер

## Что было исправлено

1. ✅ **CSV экспорт** — теперь включает колонки `undertone` и `skin_type`, каждый продукт в отдельной строке
2. ✅ **Каталог всех продуктов** — новая секция в админке показывает ВСЕ продукты из базы с пагинацией (по 100 за раз)

## Команды для обновления на сервере

### 1. Подключитесь к серверу
```bash
ssh root@194.87.144.132
```

### 2. Обновите backend (FastAPI)

```bash
# Перейдите в папку с backend
cd /path/to/backend  # замените на реальный путь, например /var/www/skincode/backend

# Подтяните изменения
git pull origin main

# Перезапустите FastAPI сервис
# Если используете systemd:
systemctl restart skincode-api

# Если используете supervisor:
supervisorctl restart skincode-api

# Если запускаете вручную через screen/tmux:
# 1. Найдите процесс: ps aux | grep uvicorn
# 2. Убейте: kill -9 <PID>
# 3. Запустите заново: uvicorn main:app --host 0.0.0.0 --port 8000
```

### 3. Обновите админ-панель (статика)

```bash
# Перейдите в папку с админкой
cd /path/to/admin-tool  # например /var/www/admin.skincode.tech

# Подтяните изменения
git pull origin main

# Если статика раздаётся через nginx, перезагрузка не нужна
# Файлы обновятся автоматически
```

### 4. Проверьте работу

1. Откройте `https://admin.skincode.tech`
2. В секции "Каталог всех продуктов" должны появиться продукты
3. Нажмите "Загрузить ещё" — должны подгрузиться следующие 100
4. Скачайте CSV из секции "Пользователи и их продукты" — проверьте, что есть колонки `undertone` и `skin_type`

## Если что-то пошло не так

### Backend не запускается
```bash
# Проверьте логи
journalctl -u skincode-api -n 50

# Или если supervisor:
tail -f /var/log/supervisor/skincode-api.log
```

### Админка не обновилась
```bash
# Очистите кеш браузера (Ctrl+Shift+R)
# Или проверьте версию файлов на сервере:
ls -la /path/to/admin-tool/app.js
cat /path/to/admin-tool/app.js | grep "loadCatalog"
```

### API возвращает 403 (Invalid admin token)
```bash
# Проверьте переменную окружения
echo $ADMIN_API_TOKEN

# Если пустая, добавьте в .env или systemd service:
export ADMIN_API_TOKEN=dev-admin-token
```

## Альтернативный способ (если git pull не работает)

Если на сервере есть локальные изменения и git pull конфликтует:

```bash
# Сохраните локальные изменения
git stash

# Подтяните обновления
git pull origin main

# Верните локальные изменения (если нужно)
git stash pop
```

Или просто скопируйте файлы вручную через scp:

```bash
# С вашего локального компьютера:
scp backend/crud.py root@194.87.144.132:/path/to/backend/
scp backend/schemas.py root@194.87.144.132:/path/to/backend/
scp backend/main.py root@194.87.144.132:/path/to/backend/
scp admin-tool/index.html root@194.87.144.132:/path/to/admin-tool/
scp admin-tool/app.js root@194.87.144.132:/path/to/admin-tool/
```

## Контакты для помощи

Если возникнут проблемы, проверьте:
- Логи backend: `journalctl -u skincode-api`
- Логи nginx: `tail -f /var/log/nginx/error.log`
- Доступность API: `curl -H "X-Admin-Token: dev-admin-token" http://localhost:8000/admin/stats`
