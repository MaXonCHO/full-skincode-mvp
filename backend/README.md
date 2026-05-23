# SkinCode Backend

Backend API для SkinCode - сервиса подбора тональных средств.

## Технологический стек

- **Python 3.9+**
- **FastAPI** - веб-фреймворк
- **PostgreSQL** - база данных
- **SQLAlchemy** - ORM
- **Pydantic** - валидация данных

## Установка

1. Создайте виртуальное окружение:
```bash
python -m venv venv
source venv/bin/activate  # для Linux/Mac
# или
venv\Scripts\activate  # для Windows
```

2. Установите зависимости:
```bash
pip install -r requirements.txt
```

3. Настройте переменные окружения:
```bash
cp .env.example .env
# Отредактируйте .env с вашими настройками базы данных
```

4. Запустите PostgreSQL:
```bash
# Используя Docker
docker run --name skincode-db -e POSTGRES_PASSWORD=yourpassword -e POSTGRES_DB=skincode -p 5432:5432 -d postgres
```

5. Инициализируйте базу данных:
```bash
python init_db.py
```

6. Запустите сервер:
```bash
python main.py
# или
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

После запуска сервера, документация доступна по адресу:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Основные endpoints

### Users
- `POST /users/` - создать пользователя
- `GET /users/{user_id}` - получить пользователя
- `PATCH /users/{user_id}` - обновить данные пользователя (undertone, skin_type)
- `GET /users/{user_id}/products` - получить продукты пользователя
- `POST /users/{user_id}/products` - добавить продукт пользователю
- `DELETE /users/{user_id}/products/{product_id}` - удалить продукт пользователя

### Products
- `GET /products/` - получить список продуктов
- `GET /products/{product_id}` - получить продукт по ID
- `GET /products/brand/{brand}` - получить продукты бренда
- `GET /products/brand/{brand}/line/{line}` - получить продукты бренда и линейки
- `GET /brands/` - получить список всех брендов
- `GET /brands/{brand}/lines` - получить линейки бренда
- `POST /products/search` - поиск продуктов

### Recommendations
- `POST /recommendations/` - получить рекомендации для пользователя
- `GET /users/{user_id}/recommendations` - получить сохраненные рекомендации

## Архитектура recommendation engine

Recommendation engine использует collaborative filtering и co-occurrence analysis:

1. **Co-occurrence analysis**: анализирует какие продукты часто используют вместе похожие пользователи
2. **User similarity**: находит пользователей с похожими продуктами и характеристиками кожи
3. **Weighted scoring**: финальный score рассчитывается по формуле:
   ```
   score = (co_occurrence_count * 1.0) + (undertone_match * 40.0) + (skin_type_match * 30.0)
   ```

## Database Schema

### Users
- `id` - primary key
- `anonymous_id` - уникальный ID для анонимных пользователей
- `undertone` - подтон кожи (warm, cool, neutral, olive)
- `skin_type` - тип кожи (dry, oily, combination, normal)
- `created_at`, `updated_at` - timestamps

### Products
- `id` - primary key
- `brand` - бренд
- `line` - линейка продуктов
- `shade` - оттенок
- `hex` - hex код цвета
- `image_url` - URL изображения
- `product_url` - URL продукта
- `price` - цена
- `category` - категория (light_warm, medium_neutral, etc.)

### UserProducts
- `id` - primary key
- `user_id` - foreign key to users
- `product_id` - foreign key to products
- `created_at` - timestamp

### ProductCoOccurrences
- `id` - primary key
- `product_a_id` - foreign key to products
- `product_b_id` - foreign key to products
- `co_occurrence_count` - количество совместных использований
- `updated_at` - timestamp

### Recommendations
- `id` - primary key
- `user_id` - foreign key to users
- `product_id` - foreign key to products
- `score` - финальный score рекомендации
- `rank` - позиция в топе (1-5)
- `co_occurrence_score`, `undertone_match_score`, `skin_type_match_score` - компоненты score
- `created_at` - timestamp

## Scaling roadmap

1. **Phase 1 (MVP)**: Single PostgreSQL instance, in-memory recommendation engine
2. **Phase 2**: Redis для кэширования рекомендаций
3. **Phase 3**: Асинхронные задачи для обновления co-occurrence matrix
4. **Phase 4**: Read replicas для масштабирования чтения
5. **Phase 5**: Vector database для более продвинутых рекомендаций
