# SkinCode MVP - Сервис подбора тональных средств

Production-ready MVP для beauty-tech проекта SkinCode. Сервис сбора пользовательских тональных средств и подбора похожих продуктов на основе collaborative filtering и co-occurrence analysis.

## 🚀 Быстрый старт

### Требования
- Docker & Docker Compose
- Python 3.11+ (для локальной разработки без Docker)

### Запуск с Docker Compose (рекомендуется)

```bash
# Клонируйте репозиторий
cd "фул скинкод 2"

# Запустите все сервисы
docker-compose up --build

# Frontend: http://localhost:8080
# API будет доступен через reverse proxy: http://localhost:8080/api
# API Documentation: http://localhost:8000/docs
```

### Локальная разработка

```bash
# Backend
cd backend

# Создайте виртуальное окружение
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или venv\Scripts\activate  # Windows

# Установите зависимости
pip install -r requirements.txt

# Настройте .env файл
cp .env.example .env
# Отредактируйте DATABASE_URL в .env

# Запустите PostgreSQL (например, через Docker)
docker run --name skincode-db -e POSTGRES_PASSWORD=skincode_password -e POSTGRES_DB=skincode -p 5432:5432 -d postgres:15-alpine

# Инициализируйте базу данных
python init_db.py

# Запустите сервер
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 📁 Структура проекта

```
фул скинкод 2/
├── backend/                    # Backend API
│   ├── main.py                # FastAPI приложение
│   ├── database.py            # Конфигурация БД
│   ├── models.py              # SQLAlchemy модели
│   ├── schemas.py             # Pydantic схемы
│   ├── crud.py                # CRUD операции
│   ├── recommendation_engine.py # Recommendation engine
│   ├── init_db.py             # Инициализация БД
│   ├── requirements.txt       # Python зависимости
│   └── .env.example           # Пример переменных окружения
├── index.html                 # Главная страница
├── api.js                     # API клиент для frontend
├── app-api.js                # Frontend логика с интеграцией API
├── data.js                   # Статические данные (legacy)
├── app.js                    # Legacy frontend (без API)
├── styles.css                 # Стили
├── algorithm.html             # Страница алгоритма
├── how-it-works.html         # Страница "Как это работает"
├── faq.html                   # FAQ
├── Dockerfile                # Docker конфигурация backend
├── docker-compose.yml        # Docker Compose конфигурация
├── ARCHITECTURE.md           # Техническая архитектура
└── README.md                 # Этот файл
```

## 🔧 API Endpoints

### Users
- `POST /users/` - создать пользователя
- `GET /users/{user_id}` - получить пользователя
- `PATCH /users/{user_id}` - обновить данные пользователя
- `GET /users/{user_id}/products` - получить продукты пользователя
- `POST /users/{user_id}/products` - добавить продукт
- `DELETE /users/{user_id}/products/{product_id}` - удалить продукт

### Products
- `GET /products/` - список продуктов
- `GET /products/{product_id}` - продукт по ID
- `GET /products/brand/{brand}` - продукты бренда
- `GET /products/brand/{brand}/line/{line}` - продукты бренда и линейки
- `GET /brands/` - список брендов
- `GET /brands/{brand}/lines` - линейки бренда
- `POST /products/search` - поиск продуктов

### Recommendations
- `POST /recommendations/` - получить рекомендации
- `GET /users/{user_id}/recommendations` - сохраненные рекомендации

## 🧠 Recommendation Engine

### Алгоритм

1. **User Similarity**: находит пользователей с похожими продуктами
2. **Co-occurrence Analysis**: анализирует частоту совместного использования продуктов
3. **Candidate Generation**: собирает кандидатов для рекомендаций
4. **Weighted Scoring**: считает финальный score
   ```
   score = (co_occurrence_count * 1.0) + similarity_bonus
   ```
5. **Ranking**: сортирует и возвращает топ-5

Подробнее в [ARCHITECTURE.md](ARCHITECTURE.md)

## 🗄️ Database Schema

- **users**: пользователи (анонимные)
- **products**: тональные средства
- **user_products**: связь пользователей и продуктов
- **product_co_occurrences**: матрица co-occurrence
- **recommendations**: сохраненные рекомендации

## 🎨 Frontend

### Интеграция с API

Frontend использует `api.js` для общения с backend:
- Автоматическая генерация anonymous ID
- Сохранение в localStorage
- Асинхронные запросы к API

### Файлы
- `index.html` - главная страница
- `api.js` - API клиент
- `app-api.js` - логика приложения с интеграцией API

## 🚢 Deployment

### Production

1. Измените переменные окружения в `.env`:
   ```env
   DATABASE_URL=postgresql://user:pass@host:5432/db
   SECRET_KEY=<strong-random-key>
   ```

2. Используйте managed PostgreSQL (AWS RDS, Google Cloud SQL)

3. Настройте CORS origins:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://yourdomain.com"],
       ...
   )
   ```

4. Используйте reverse proxy (Nginx)

## 📊 Мониторинг

### Ключевые метрики
- API response time
- Recommendation generation time
- Database query time
- Error rate

### Рекомендуемые инструменты
- Prometheus + Grafana
- Sentry для error tracking
- Structured logging

## 🔒 Безопасность

### Текущие меры (MVP)
- CORS configuration
- SQL injection protection (SQLAlchemy ORM)
- Input validation (Pydantic)

### Для Production
- Rate limiting
- Authentication/Authorization (JWT)
- HTTPS only
- Secrets management

## 🧪 Тестирование

```bash
# Запуск тестов (когда будут добавлены)
pytest

# Load testing
locust -f locustfile.py
```

## 📈 Scaling Roadmap

- **Phase 1 (MVP)**: Текущий
- **Phase 2**: Redis кэширование, connection pooling
- **Phase 3**: Read replicas, horizontal scaling
- **Phase 4**: Async tasks (Celery), background jobs
- **Phase 5**: Vector database, ML models

Подробнее в [ARCHITECTURE.md](ARCHITECTURE.md)

## 🐛 Troubleshooting

### Backend не запускается
```bash
# Проверьте, что PostgreSQL запущен
docker ps

# Проверьте логи
docker-compose logs backend

# Пересоздайте контейнеры
docker-compose down
docker-compose up --build
```

### Frontend не соединяется с API
```bash
# Проверьте, что backend запущен
curl http://localhost:8000/health

# Проверьте CORS настройки в main.py
```

### Ошибка подключения к БД
```bash
# Проверьте DATABASE_URL в .env
# Убедитесь, что PostgreSQL доступен
docker-compose exec postgres psql -U skincode -d skincode
```

## 📝 Known Limitations (MVP)

1. Нет AI/CV - рекомендации основаны только на collaborative filtering
2. Ограниченный dataset - только несколько брендов
3. Нет персистентности сессий - потеря данных при очистке localStorage
4. Синхронный recommendation engine

## 🤝 Contributing

1. Fork репозитория
2. Создайте feature branch
3. Commit изменения
4. Push в branch
5. Open Pull Request

## 📄 License

© 2026 Скинкод. Все права защищены.

## 📞 Контакты

- Email: hello@skincode.ru
- GitHub: [repository link]

## 🙏 Acknowledgments

- Findation - вдохновение для алгоритма
- FastAPI - отличный веб-фреймворк
- PostgreSQL - надежная база данных
