from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import os
import datetime

from database import get_db, engine, Base, SessionLocal
from product_utils import product_image_url, infer_category
from models import User, Product, UserProduct, Recommendation
from schemas import (
    UserCreate, UserResponse,
    ProductCreate, ProductResponse,
    UserProductCreate, UserProductResponse,
    RecommendationRequest, RecommendationResponse,
    SearchRequest, SearchResponse,
    CoOccurrenceCreate, CoOccurrenceResponse, CoOccurrenceUpdate,
    GapProductsResponse, LinkStatsResponse, AdminUserProductsResponse, AllProductsResponse
)

try:  # Railway/Render могут использовать старую версию schemas во время деплоя
    from schemas import UserProductAddedResponse
except ImportError:
    UserProductAddedResponse = UserProductResponse
from crud import (
    get_user, get_user_by_anonymous_id, create_user, update_user,
    get_products, get_product, get_products_by_brand, get_products_by_brand_and_line,
    create_product, search_products, get_brands, get_lines_by_brand,
    add_user_product, get_user_products, delete_user_product, get_user_recommendations,
    list_co_occurrences, search_co_occurrences, create_or_update_co_occurrence,
    update_co_occurrence, delete_co_occurrence, get_unlinked_products, get_link_stats, 
    get_user_product_groups, get_all_products_paginated
)
from recommendation_engine import RecommendationEngine
from init_db import init_database
from load_csv import load_csv_to_database

# Создаем таблицы
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SkinCode API", version="1.0.0")
ADMIN_API_TOKEN = os.getenv("ADMIN_API_TOKEN", "dev-admin-token")


def require_admin_token(x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token")):
    if not x_admin_token or x_admin_token != ADMIN_API_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid admin token")


@app.on_event("startup")
async def startup_event():
    """При старте: миграция схемы + автозагрузка продуктов если база пуста."""
    db = SessionLocal()
    try:
        # --- Миграция: добавляем session_id если колонки ещё нет ---
        try:
            db.execute(text("ALTER TABLE user_products ADD COLUMN session_id VARCHAR(36)"))
            db.commit()
        except Exception:
            db.rollback()

        # --- Миграция: убираем старый уникальный индекс по (user, product) ---
        try:
            db.execute(text("DROP INDEX IF EXISTS idx_user_product_unique"))
            db.commit()
        except Exception:
            db.rollback()

        # --- Миграция: создаём новый индекс по (user, product, session) ---
        try:
            db.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_user_product_session_unique "
                "ON user_products (user_id, product_id, session_id)"
            ))
            db.commit()
        except Exception:
            db.rollback()

        # --- Автозагрузка продуктов из CSV если таблица пуста ---
        product_count = db.query(Product).count()
        if product_count == 0:
            csv_path = os.path.join(os.path.dirname(__file__), 'products.csv')
            if os.path.exists(csv_path):
                load_csv_to_database(csv_file_path=csv_path)
            else:
                csv_url = "https://raw.githubusercontent.com/MaXonCHO/full-skincode-mvp/main/backend/products.csv"
                load_csv_to_database(csv_url=csv_url)
    except Exception as e:
        print(f"Startup error: {e}")
    finally:
        db.close()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Для MVP разрешаем все origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/health")
def health_check():
    return {"status": "ok"}


# Initialize database with products
@app.get("/init-db")
def init_db_endpoint():
    """Инициализирует базу данных начальными данными продуктов."""
    try:
        init_database()
        return {"status": "success", "message": "Database initialized with products"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Load CSV data to database
@app.get("/load-csv")
def load_csv_endpoint():
    """Загружает данные из CSV файла в базу данных."""
    try:
        # Сначала пробуем загрузить из локального файла
        csv_path = os.path.join(os.path.dirname(__file__), 'products.csv')
        if os.path.exists(csv_path):
            load_csv_to_database(csv_file_path=csv_path)
            return {"status": "success", "message": "CSV data loaded from local file"}
        else:
            # Если локальный файл не существует, пробуем GitHub raw URL
            csv_url = "https://raw.githubusercontent.com/MaXonCHO/full-skincode-mvp/main/backend/products.csv"
            load_csv_to_database(csv_url=csv_url)
            return {"status": "success", "message": "CSV data loaded from GitHub"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Load products directly from CSV data
@app.post("/load-products")
def load_products_endpoint(products_data: List[dict]):
    """Загружает продукты напрямую из данных в базу данных."""
    db = SessionLocal()
    try:
        # Очищаем существующие продукты
        db.query(Product).delete()
        db.commit()

        products_count = 0
        for row in products_data:
            brand = row.get('brand', '')
            line = row.get('name', '')
            shade = row.get('shade_value', '') or row.get('shade_name', '')

            product = Product(
                brand=brand,
                line=line,
                shade=shade,
                hex='#E8D5C4',
                image_url=product_image_url(brand),
                product_url=row.get('product_url', ''),
                price=float(row.get('price_actual', 0)) if row.get('price_actual') else 0,
                category=infer_category(shade, row.get('shade_name', ''))
            )

            db.add(product)
            products_count += 1

        db.commit()
        return {"status": "success", "message": f"Loaded {products_count} products"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# Check if CSV file exists
@app.get("/check-csv")
def check_csv_endpoint():
    """Проверяет существование CSV файла."""
    try:
        csv_path = os.path.join(os.path.dirname(__file__), 'products.csv')
        exists = os.path.exists(csv_path)
        if exists:
            size = os.path.getsize(csv_path)
            return {"status": "success", "exists": True, "size": size, "path": csv_path}
        else:
            return {"status": "error", "exists": False, "path": csv_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== USER ENDPOINTS =====

@app.post("/users/", response_model=UserResponse)
def create_user_endpoint(user: UserCreate, db: Session = Depends(get_db)):
    """
    Создает нового пользователя. Если передан anonymous_id и он существует,
    возвращает существующего пользователя.
    """
    if user.anonymous_id:
        existing_user = get_user_by_anonymous_id(db, user.anonymous_id)
        if existing_user:
            return existing_user
    
    return create_user(db, user)


@app.get("/users/{user_id}", response_model=UserResponse)
def get_user_endpoint(user_id: int, db: Session = Depends(get_db)):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.patch("/users/{user_id}", response_model=UserResponse)
def update_user_endpoint(
    user_id: int,
    undertone: Optional[str] = None,
    skin_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    user = update_user(db, user_id, undertone, skin_type)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/users/{user_id}/products", response_model=List[UserProductResponse])
def get_user_products_endpoint(user_id: int, db: Session = Depends(get_db)):
    return get_user_products(db, user_id)


def _update_co_occurrence_background():
    db = SessionLocal()
    try:
        RecommendationEngine(db).update_co_occurrence_matrix()
    except Exception:
        pass
    finally:
        db.close()


@app.post("/users/{user_id}/products", response_model=UserProductAddedResponse)
def add_user_product_endpoint(
    user_id: int,
    user_product: UserProductCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    product = get_product(db, user_product.product_id)
    if not product:
        raise HTTPException(
            status_code=404,
            detail=f"Product not found (id={user_product.product_id})",
        )

    result = add_user_product(db, user_id, user_product.product_id)
    background_tasks.add_task(_update_co_occurrence_background)
    return result


@app.delete("/users/{user_id}/products/{product_id}")
def delete_user_product_endpoint(user_id: int, product_id: int, db: Session = Depends(get_db)):
    success = delete_user_product(db, user_id, product_id)
    if not success:
        raise HTTPException(status_code=404, detail="User product not found")
    return {"message": "Product removed successfully"}


# ===== PRODUCT ENDPOINTS =====

@app.get("/products/", response_model=List[ProductResponse])
def get_products_endpoint(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return get_products(db, skip=skip, limit=limit)


@app.get("/products/{product_id}", response_model=ProductResponse)
def get_product_endpoint(product_id: int, db: Session = Depends(get_db)):
    product = get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.get("/products/brand/{brand}", response_model=List[ProductResponse])
def get_products_by_brand_endpoint(brand: str, db: Session = Depends(get_db)):
    return get_products_by_brand(db, brand)


@app.get("/products/brand/{brand}/line/{line}", response_model=List[ProductResponse])
def get_products_by_brand_and_line_endpoint(brand: str, line: str, db: Session = Depends(get_db)):
    return get_products_by_brand_and_line(db, brand, line)


@app.get("/brands/", response_model=List[str])
def get_brands_endpoint(db: Session = Depends(get_db)):
    """
    Возвращает список всех брендов.
    """
    return get_brands(db)


@app.get("/brands/{brand}/lines", response_model=List[str])
def get_lines_by_brand_endpoint(brand: str, db: Session = Depends(get_db)):
    """
    Возвращает список линеек для заданного бренда.
    """
    return get_lines_by_brand(db, brand)


@app.post("/products/search", response_model=SearchResponse)
def search_products_endpoint(search: SearchRequest, db: Session = Depends(get_db)):
    """
    Поиск продуктов по бренду, линейке или оттенку.
    """
    products = search_products(db, search.query, search.limit)
    return SearchResponse(products=products, total=len(products))


# ===== RECOMMENDATION ENDPOINTS =====

@app.post("/recommendations/", response_model=List[RecommendationResponse])
def get_recommendations_endpoint(request: RecommendationRequest, db: Session = Depends(get_db)):
    """
    Генерирует рекомендации для пользователя на основе выбранных продуктов
    и характеристик кожи.
    """
    # Проверяем существование пользователя
    user = get_user(db, request.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Обновляем данные пользователя если переданы
    if request.undertone or request.skin_type:
        user = update_user(db, request.user_id, request.undertone, request.skin_type)
    
    # Добавляем продукты пользователю — все под одним session_id (связка)
    bundle_session_id = str(uuid.uuid4())
    for product_id in request.product_ids:
        add_user_product(db, request.user_id, product_id, bundle_session_id)
    
    # Генерируем рекомендации
    engine = RecommendationEngine(db)
    recommendations_data = engine.generate_recommendations(
        user_id=request.user_id,
        undertone=request.undertone or user.undertone,
        skin_type=request.skin_type or user.skin_type,
        product_ids=request.product_ids,
        top_k=5
    )
    
    # Сохраняем рекомендации и обновляем co-occurrence graph
    engine.save_recommendations(request.user_id, recommendations_data)
    try:
        engine.update_co_occurrence_matrix()
    except Exception:
        pass
    
    # Формируем ответ
    recommendations = []
    for rank, rec_data in enumerate(recommendations_data, start=1):
        product = get_product(db, rec_data['product_id'])
        if product:
            recommendations.append(RecommendationResponse(
                id=rank,  # временный ID
                product_id=product.id,
                score=rec_data['score'],
                rank=rank,
                product=product,
                support_count=rec_data.get('support_count'),
                confidence_label=rec_data.get('confidence_label'),
                match_ratio=rec_data.get('match_ratio'),
            ))
    
    return recommendations


@app.get("/users/{user_id}/recommendations", response_model=List[RecommendationResponse])
def get_user_recommendations_endpoint(user_id: int, db: Session = Depends(get_db)):
    """
    Возвращает сохраненные рекомендации для пользователя.
    """
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    recommendations = get_user_recommendations(db, user_id)
    
    result = []
    for rec in recommendations:
        product = get_product(db, rec.product_id)
        if product:
            result.append(RecommendationResponse(
                id=rec.id,
                product_id=rec.product_id,
                score=rec.score,
                rank=rec.rank,
                product=product
            ))
    
    return result


# ===== ADMIN ENDPOINTS =====


@app.get("/admin/links", response_model=List[CoOccurrenceResponse])
def admin_list_links(
    skip: int = 0,
    limit: int = Query(100, le=200),
    brand: Optional[str] = None,
    line: Optional[str] = None,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_token)
):
    if brand or line:
        return search_co_occurrences(db, brand=brand, line=line, limit=limit)
    return list_co_occurrences(db, skip=skip, limit=limit)


@app.post("/admin/links", response_model=CoOccurrenceResponse)
def admin_create_link(
    payload: CoOccurrenceCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_token)
):
    return create_or_update_co_occurrence(db, payload)


@app.patch("/admin/links/{link_id}", response_model=CoOccurrenceResponse)
def admin_update_link(
    link_id: int,
    payload: CoOccurrenceUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_token)
):
    record = update_co_occurrence(db, link_id, payload)
    if not record:
        raise HTTPException(status_code=404, detail="Link not found")
    return record


@app.delete("/admin/links/{link_id}")
def admin_delete_link(
    link_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_token)
):
    deleted = delete_co_occurrence(db, link_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Link not found")
    return {"message": "Link removed"}


@app.get("/admin/gaps", response_model=GapProductsResponse)
def admin_gap_products(
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_token)
):
    products = get_unlinked_products(db, limit=limit)
    return GapProductsResponse(total=len(products), products=products)


@app.get("/admin/stats", response_model=LinkStatsResponse)
def admin_link_stats(
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_token)
):
    return get_link_stats(db)


@app.get("/admin/user-products", response_model=AdminUserProductsResponse)
def admin_user_products(
    limit: int = Query(50, le=500),
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_token)
):
    groups = get_user_product_groups(db, limit=limit)
    return AdminUserProductsResponse(total_users=len(groups), items=groups)


@app.get("/admin/all-products", response_model=AllProductsResponse)
def admin_all_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_token)
):
    """Возвращает все продукты из базы с пагинацией."""
    return get_all_products_paginated(db, skip=skip, limit=limit)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
