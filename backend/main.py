from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from database import get_db, engine, Base, SessionLocal
from catalog_sync import sync_default_catalog, build_product_payload, upsert_product
from models import User, Product, UserProduct, Recommendation
from schemas import (
    UserCreate, UserResponse,
    ProductCreate, ProductResponse,
    UserProductCreate, UserProductResponse,
    RecommendationRequest, RecommendationResponse,
    SearchRequest, SearchResponse
)
from crud import (
    get_user, get_user_by_anonymous_id, create_user, update_user,
    get_products, get_product, get_products_by_brand, get_products_by_brand_and_line,
    search_products, get_brands, get_lines_by_brand,
    add_user_product, get_user_products, delete_user_product, get_user_recommendations
)
from recommendation_engine import RecommendationEngine
from init_db import init_database

# Создаем таблицы
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SkinCode API", version="1.0.0")

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
        db = SessionLocal()
        try:
            stats = sync_default_catalog(db)
        finally:
            db.close()
        return {
            "status": "success",
            "message": "Catalog synchronized from local CSV sources",
            "created": stats["created"],
            "updated": stats["updated"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Load products directly from CSV data
@app.post("/load-products")
def load_products_endpoint(products_data: List[dict]):
    """Загружает продукты напрямую из данных в базу данных."""
    db = SessionLocal()
    try:
        created = 0
        updated = 0
        for row in products_data:
            payload = build_product_payload({k.lower(): str(v) for k, v in row.items() if v is not None})
            if not payload:
                continue
            result = upsert_product(db, payload)
            if result == "created":
                created += 1
            else:
                updated += 1
        db.commit()
        return {"status": "success", "message": "Products synchronized", "created": created, "updated": updated}
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
        tonal_csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'tonal_products.csv')
        legacy_csv_path = os.path.join(os.path.dirname(__file__), 'products.csv')
        tonal_exists = os.path.exists(tonal_csv_path)
        legacy_exists = os.path.exists(legacy_csv_path)
        return {
            "status": "success" if tonal_exists or legacy_exists else "error",
            "tonal_exists": tonal_exists,
            "legacy_exists": legacy_exists,
            "tonal_path": tonal_csv_path,
            "legacy_path": legacy_csv_path,
        }
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


@app.post("/users/{user_id}/products", response_model=UserProductResponse)
def add_user_product_endpoint(
    user_id: int,
    user_product: UserProductCreate,
    db: Session = Depends(get_db)
):
    # Проверяем существование пользователя
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Проверяем существование продукта
    product = get_product(db, user_product.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    result = add_user_product(db, user_id, user_product.product_id)
    try:
        RecommendationEngine(db).update_co_occurrence_matrix()
    except Exception:
        pass
    return result


@app.delete("/users/{user_id}/products/{product_id}")
def delete_user_product_endpoint(user_id: int, product_id: int, db: Session = Depends(get_db)):
    success = delete_user_product(db, user_id, product_id)
    if not success:
        raise HTTPException(status_code=404, detail="User product not found")
    try:
        RecommendationEngine(db).update_co_occurrence_matrix()
    except Exception:
        pass
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
    products = search_products(
        db,
        query=search.query,
        limit=search.limit,
        brand=search.brand,
        model=search.model,
        shade=search.shade,
    )
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

    # Добавляем продукты пользователю
    for product_id in request.product_ids:
        add_user_product(db, request.user_id, product_id)
    
    # Генерируем рекомендации
    engine = RecommendationEngine(db)
    try:
        engine.update_co_occurrence_matrix()
    except Exception:
        pass
    recommendations_data = engine.generate_recommendations(
        user_id=request.user_id,
        undertone=None,
        skin_type=None,
        product_ids=request.product_ids,
        top_k=5
    )
    
    # Сохраняем рекомендации
    engine.save_recommendations(request.user_id, recommendations_data)
    
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
                product=product
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
