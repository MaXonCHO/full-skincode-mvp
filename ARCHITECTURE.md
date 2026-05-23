# SkinCode MVP - Техническая Архитектура

## Обзор

SkinCode - это MVP web-приложения для подбора тональных средств на основе collaborative filtering и co-occurrence analysis.

## Технологический стек

### Frontend
- **HTML5/CSS3/JavaScript** - статический frontend
- **Vanilla JS** - без фреймворков для простоты MVP
- **Fetch API** - для общения с backend

### Backend
- **Python 3.11+** - основной язык
- **FastAPI** - веб-фреймворк с автоматической документацией
- **SQLAlchemy 2.0** - ORM для работы с базой данных
- **Pydantic** - валидация данных и serialization

### Database
- **PostgreSQL 15** - реляционная база данных
- **SQLAlchemy ORM** - абстракция над SQL

### Infrastructure
- **Docker & Docker Compose** - контейнеризация
- **Uvicorn** - ASGI сервер

## Архитектура системы

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Frontend      │         │   Backend API   │         │   PostgreSQL    │
│   (HTML/JS)     │◄────────►   (FastAPI)     │◄────────►   Database      │
│                 │  HTTP   │                 │  SQL    │                 │
│  - UI           │         │  - Endpoints    │         │  - Users        │
│  - api.js       │         │  - CRUD         │         │  - Products     │
│  - app-api.js   │         │  - Rec Engine   │         │  - UserProducts │
└─────────────────┘         │                 │         │  - CoOccurrences│
                            └─────────────────┘         │  - Recommendations│
                                                               └─────────────────┘
```

## Database Schema

### Users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    anonymous_id VARCHAR(255) UNIQUE,
    undertone VARCHAR(50),           -- warm, cool, neutral, olive
    skin_type VARCHAR(50),           -- dry, oily, combination, normal
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Products
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(255) NOT NULL,
    line VARCHAR(255) NOT NULL,
    shade VARCHAR(255) NOT NULL,
    hex VARCHAR(7),
    image_url TEXT,
    product_url TEXT,
    price DECIMAL,
    category VARCHAR(50),            -- light_warm, medium_neutral, etc.
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_brand_line_shade (brand, line, shade),
    INDEX idx_category (category)
);
```

### UserProducts
```sql
CREATE TABLE user_products (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE (user_id, product_id)
);
```

### ProductCoOccurrences
```sql
CREATE TABLE product_co_occurrences (
    id SERIAL PRIMARY KEY,
    product_a_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    product_b_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    co_occurrence_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE (product_a_id, product_b_id)
);
```

### Recommendations
```sql
CREATE TABLE recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    score FLOAT NOT NULL,
    rank INTEGER NOT NULL,
    co_occurrence_score FLOAT DEFAULT 0,
    undertone_match_score FLOAT DEFAULT 0,
    skin_type_match_score FLOAT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_user_recommendations (user_id, rank)
);
```

## API Endpoints

### Users
- `POST /users/` - создать пользователя
- `GET /users/{user_id}` - получить пользователя
- `PATCH /users/{user_id}` - обновить undertone/skin_type
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

## Recommendation Engine

### Алгоритм

1. **User Similarity**
   - Находит пользователей с теми же продуктами
   - Фильтрует по undertone и skin_type если указаны

2. **Co-occurrence Analysis**
   - Анализирует какие продукты используют похожие пользователи
   - Считает частоту совместного использования

3. **Candidate Generation**
   - Собирает продукты, которые используют похожие пользователи
   - Исключает уже выбранные продукты

4. **Scoring**
   ```
   score = (co_occurrence_count * 1.0)
         + (undertone_match * 40.0)
         + (skin_type_match * 30.0)
   ```

5. **Ranking**
   - Сортирует по score
   - Возвращает топ-5

### Веса

- **Co-occurrence**: 1.0 - базовый вес для частоты использования
- **Undertone match**: 40.0 - высокий приоритет совпадения подтона
- **Skin type match**: 30.0 - средний приоритет типа кожи

## Deployment

### Локальная разработка

```bash
# Запуск с Docker Compose
docker-compose up

# Инициализация базы данных
docker-compose exec backend python init_db.py
```

### Production

#### Рекомендуемая конфигурация:
- **Backend**: VPS с 2-4 CPU, 4-8 GB RAM
- **Database**: Managed PostgreSQL (AWS RDS, Google Cloud SQL)
- **CDN**: CloudFront/CloudFlare для статических файлов
- **Monitoring**: Prometheus + Grafana

#### Environment Variables:
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
SECRET_KEY=<strong-random-key>
CORS_ORIGINS=https://skinkode.ru
```

## Scaling Roadmap

### Phase 1 (MVP) - Текущий
- Single PostgreSQL instance
- In-memory recommendation engine
- synchronous API calls

### Phase 2 - Оптимизация
- Redis для кэширования рекомендаций
- Connection pooling
- Async database operations

### Phase 3 - Масштабирование
- Read replicas для PostgreSQL
- Horizontal scaling backend (multiple instances)
- Load balancer (Nginx/HAProxy)

### Phase 4 - Advanced Features
- Асинхронные задачи (Celery) для обновления co-occurrence matrix
- Background job для периодического пересчета рекомендаций
- Message queue (RabbitMQ/Redis)

### Phase 5 - Production-grade
- Vector database для semantic search
- Machine learning модели для улучшения рекомендаций
- A/B testing framework
- Real-time analytics

## Безопасность

### Текущие меры (MVP):
- CORS configuration
- SQL injection protection (SQLAlchemy ORM)
- Input validation (Pydantic)

### Для Production:
- Rate limiting
- Authentication/Authorization (JWT)
- HTTPS only
- Secrets management (AWS Secrets Manager / HashiCorp Vault)
- Regular security audits

## Мониторинг и логирование

### Рекомендуемые инструменты:
- **Logging**: Structured logging (JSON format)
- **Metrics**: Prometheus + Grafana
- **Tracing**: OpenTelemetry + Jaeger
- **Error tracking**: Sentry

### Ключевые метрики:
- API response time
- Database query time
- Recommendation generation time
- User engagement (conversion rate)
- Error rate

## Анонимные пользователи

### Flow:
1. Генерируется UUID при первом посещении
2. Сохраняется в localStorage
3. Отправляется с каждым запросом
4. Используется для идентификации без регистрации

### Преимущества:
- Нет барьера входа
- Сбор данных с первого визита
- Возможность конвертации в зарегистрированного пользователя

## Data Collection Strategy

### Что собираем:
- Выбранные продукты
- Undertone и skin_type
- Timestamps
- Co-occurrence patterns

### Цели:
- Построение recommendation dataset
- Анализ популярных оттенков
- Понимание пользовательских предпочтений
- Подготовка к будущим skin-scanner устройствам

## Performance Considerations

### Оптимизации:
- Database indexes на часто запрашиваемых полях
- Connection pooling
- Кэширование списков брендов/линеек
- Lazy loading изображений на frontend

### Target metrics:
- API response time: < 200ms (p95)
- Recommendation generation: < 500ms
- Database query time: < 50ms (p95)

## Testing Strategy

### Unit tests:
- CRUD operations
- Recommendation engine logic
- Scoring algorithms

### Integration tests:
- API endpoints
- Database operations
- End-to-end user flows

### Load testing:
- Concurrent users simulation
- Database stress testing
- API performance under load

## Known Limitations (MVP)

1. **Нет AI/CV**: рекомендации основаны только на collaborative filtering
2. **Ограниченный dataset**: только несколько брендов
3. **Нет персистентности сессий**: потеря данных при очистке localStorage
4. **Синхронный recommendation engine**: может быть медленным при большом количестве пользователей
5. **Нет A/B testing**: невозможно сравнить разные алгоритмы

## Future Enhancements

1. **Computer Vision**: интеграция с skin-scanner устройствами
2. **ML Models**: обучение на собранном dataset
3. **Social features**: отзывы, рейтинги, пользовательский контент
4. **Mobile app**: нативное приложение
5. **AR try-on**: виртуальное примерка
6. **Personalization**: более глубокий анализ предпочтений
