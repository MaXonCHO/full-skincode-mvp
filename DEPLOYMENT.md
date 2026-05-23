# Деплой SkinCode MVP

## План деплоя

### 1. Backend на Render (бесплатно)

1. **Создайте аккаунт на Render.com**
   - Зарегистрируйтесь на https://render.com
   - Подключите GitHub репозиторий

2. **Загрузите код на GitHub**
   ```bash
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/ВАШ_ЮЗЕРНЕЙМ/skincode-mvp.git
   git push -u origin main
   ```

3. **Создайте новый Web Service на Render**
   - Dashboard → New → Web Service
   - Подключите GitHub репозиторий
   - Render автоматически найдет `render.yaml`
   - Нажмите "Create Web Service"

4. **Получите URL backend**
   - После деплоя Render выдаст URL вида: `https://skincode-backend.onrender.com`
   - Скопируйте этот URL

5. **Инициализируйте базу данных**
   - После первого деплоя зайдите в Logs на Render
   - Найдите логи инициализации БД
   - Или добавьте endpoint для ручной инициализации

### 2. Frontend на Vercel

1. **Создайте аккаунт на Vercel**
   - Зарегистрируйтесь на https://vercel.com
   - Подключите GitHub репозиторий

2. **Обновите API URL в frontend**
   - Откройте `api.js`
   - Замените `const API_BASE_URL = 'http://localhost:8000';`
   - На `const API_BASE_URL = 'https://skincode-backend.onrender.com';`

3. **Загрузите изменения на GitHub**
   ```bash
   git add api.js
   git commit -m "Update API URL for production"
   git push
   ```

4. **Создайте новый проект на Vercel**
   - Dashboard → Add New → Project
   - Выберите GitHub репозиторий
   - Vercel автоматически найдет `vercel.json`
   - Нажмите "Deploy"

5. **Получите URL frontend**
   - После деплоя Vercel выдаст URL вида: `https://skincode-mvp.vercel.app`

### 3. Тестирование

1. Откройте URL frontend в браузере
2. Протестируйте:
   - Выбор подтона и типа кожи
   - Выбор бренда
   - Выбор линейки (dropdown с картинками)
   - Выбор оттенка
   - Добавление продуктов
   - Получение рекомендаций

## Возможные проблемы

### Backend на Render

**Проблема**: База данных SQLite не персистентна на Render
**Решение**: Для production используйте PostgreSQL
- Создайте бесплатный PostgreSQL на Render
- Обновите `DATABASE_URL` в настройках Render

**Проблема**: Холодный старт (cold start)
**Решение**: Render free tier имеет холодный старт ~50 секунд
- Первый запрос может быть медленным
- Последующие запросы быстрые

### Frontend на Vercel

**Проблема**: CORS ошибки
**Решение**: Убедитесь что backend разрешает CORS
- В `main.py` уже настроен `allow_origins=["*"]`
- Для production укажите конкретный домен

**Проблема**: API недоступен
**Решение**: Проверьте что backend запущен
- Зайдите в Logs на Render
- Проверьте что API отвечает: `https://skincode-backend.onrender.com/health`

## Альтернатива: Локальный backend + Vercel frontend

Если не хотите деплоить backend:

1. Оставьте backend локальным
2. В `api.js` оставьте `localhost:8000`
3. Деплойте только frontend на Vercel
4. Запустите backend локально: `cd backend && venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000`
5. Используйте ngrok для туннелирования: `ngrok http 8000`
6. Обновите API URL на ngrok URL

## Следующие шаги после деплоя

1. Настройте мониторинг (Render Logs, Vercel Analytics)
2. Добавьте rate limiting
3. Подключите PostgreSQL вместо SQLite
4. Настройте CI/CD
5. Добавьте тесты
