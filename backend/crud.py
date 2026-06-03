from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from models import (
    User,
    Product,
    UserProduct,
    Recommendation,
    ProductCoOccurrence,
    BlockedCoOccurrence,
)
from schemas import UserCreate, ProductCreate, UserProductCreate, CoOccurrenceCreate, CoOccurrenceUpdate
from typing import List, Optional
import uuid


def get_user(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_anonymous_id(db: Session, anonymous_id: str) -> Optional[User]:
    return db.query(User).filter(User.anonymous_id == anonymous_id).first()


def create_user(db: Session, user: UserCreate) -> User:
    # Если anonymous_id не передан, генерируем новый
    anonymous_id = user.anonymous_id or str(uuid.uuid4())
    
    db_user = User(
        anonymous_id=anonymous_id,
        undertone=user.undertone,
        skin_type=user.skin_type
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user_id: int, undertone: Optional[str], skin_type: Optional[str]) -> Optional[User]:
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    if undertone is not None:
        db_user.undertone = undertone
    if skin_type is not None:
        db_user.skin_type = skin_type
    
    db.commit()
    db.refresh(db_user)
    return db_user


def get_products(db: Session, skip: int = 0, limit: int = 100) -> List[Product]:
    return db.query(Product).offset(skip).limit(limit).all()


def get_product(db: Session, product_id: int) -> Optional[Product]:
    return db.query(Product).filter(Product.id == product_id).first()


def get_products_by_brand(db: Session, brand: str) -> List[Product]:
    return db.query(Product).filter(Product.brand == brand).all()


def get_products_by_brand_and_line(db: Session, brand: str, line: str) -> List[Product]:
    return db.query(Product).filter(
        Product.brand == brand,
        Product.line == line
    ).all()


def create_product(db: Session, product: ProductCreate) -> Product:
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


def search_products(db: Session, query: str, limit: int = 10) -> List[Product]:
    """
    Поиск продуктов по бренду, линейке или оттенку.
    """
    search_pattern = f"%{query}%"
    return db.query(Product).filter(
        or_(
            Product.brand.ilike(search_pattern),
            Product.line.ilike(search_pattern),
            Product.shade.ilike(search_pattern)
        )
    ).limit(limit).all()


def get_brands(db: Session) -> List[str]:
    """
    Возвращает список всех уникальных брендов.
    """
    result = db.query(Product.brand).distinct().all()
    return [row[0] for row in result]


def get_lines_by_brand(db: Session, brand: str) -> List[str]:
    """
    Возвращает список всех линеек для заданного бренда.
    """
    result = db.query(Product.line).filter(Product.brand == brand).distinct().all()
    return [row[0] for row in result]


def add_user_product(db: Session, user_id: int, product_id: int, session_id: Optional[str] = None) -> UserProduct:
    """
    Добавляет продукт пользователю. Если уже существует в этой сессии - возвращает существующий.
    session_id=None: индивидуальные добавления (без привязки к связке).
    session_id=UUID: группирует продукты одной связки для рекомендаций.
    """
    query = db.query(UserProduct).filter(
        UserProduct.user_id == user_id,
        UserProduct.product_id == product_id,
    )
    if session_id is not None:
        query = query.filter(UserProduct.session_id == session_id)
    else:
        query = query.filter(UserProduct.session_id.is_(None))

    existing = query.first()
    if existing:
        return existing

    user_product = UserProduct(user_id=user_id, product_id=product_id, session_id=session_id)
    db.add(user_product)
    try:
        db.commit()
        db.refresh(user_product)
    except Exception:
        db.rollback()
        return query.first() or user_product
    return user_product


def get_user_products(db: Session, user_id: int) -> List[UserProduct]:
    return db.query(UserProduct).filter(UserProduct.user_id == user_id).all()


def delete_user_product(db: Session, user_id: int, product_id: int) -> bool:
    user_product = db.query(UserProduct).filter(
        UserProduct.user_id == user_id,
        UserProduct.product_id == product_id
    ).first()
    
    if user_product:
        db.delete(user_product)
        db.commit()
        return True
    return False


def get_user_recommendations(db: Session, user_id: int) -> List[Recommendation]:
    return db.query(Recommendation).filter(
        Recommendation.user_id == user_id
    ).order_by(Recommendation.rank).all()


# ==== Admin helpers ====
def list_co_occurrences(db: Session, skip: int = 0, limit: int = 100) -> List[ProductCoOccurrence]:
    return db.query(ProductCoOccurrence).offset(skip).limit(limit).all()


def search_co_occurrences(db: Session, brand: Optional[str] = None, line: Optional[str] = None, limit: int = 100) -> List[ProductCoOccurrence]:
    query = db.query(ProductCoOccurrence).join(Product, Product.id == ProductCoOccurrence.product_a_id)
    if brand:
        query = query.filter(Product.brand.ilike(f"%{brand}%"))
    if line:
        query = query.filter(Product.line.ilike(f"%{line}%"))
    return query.limit(limit).all()


def _normalize_pair(product_a_id: int, product_b_id: int):
    return tuple(sorted([product_a_id, product_b_id]))


def create_or_update_co_occurrence(db: Session, payload: CoOccurrenceCreate) -> ProductCoOccurrence:
    a_id, b_id = _normalize_pair(payload.product_a_id, payload.product_b_id)

    db.query(BlockedCoOccurrence).filter(
        BlockedCoOccurrence.product_a_id == a_id,
        BlockedCoOccurrence.product_b_id == b_id
    ).delete(synchronize_session=False)
    record = db.query(ProductCoOccurrence).filter(
        ProductCoOccurrence.product_a_id == a_id,
        ProductCoOccurrence.product_b_id == b_id
    ).first()
    if record:
        record.co_occurrence_count = payload.co_occurrence_count
    else:
        record = ProductCoOccurrence(
            product_a_id=a_id,
            product_b_id=b_id,
            co_occurrence_count=payload.co_occurrence_count,
        )
        db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_co_occurrence(db: Session, co_id: int, payload: CoOccurrenceUpdate) -> Optional[ProductCoOccurrence]:
    record = db.query(ProductCoOccurrence).filter(ProductCoOccurrence.id == co_id).first()
    if not record:
        return None
    record.co_occurrence_count = payload.co_occurrence_count
    db.commit()
    db.refresh(record)
    return record


def delete_co_occurrence(db: Session, co_id: int) -> bool:
    record = db.query(ProductCoOccurrence).filter(ProductCoOccurrence.id == co_id).first()
    if not record:
        return False
    a_id, b_id = _normalize_pair(record.product_a_id, record.product_b_id)
    db.delete(record)
    # добавляем пару в блок-лист, чтобы автообновления не возвращали её
    exists = db.query(BlockedCoOccurrence).filter(
        BlockedCoOccurrence.product_a_id == a_id,
        BlockedCoOccurrence.product_b_id == b_id
    ).first()
    if not exists:
        db.add(BlockedCoOccurrence(product_a_id=a_id, product_b_id=b_id))
    db.commit()
    return True


def get_unlinked_products(db: Session, skip: int = 0, limit: int = 100):
    linked_ids = db.query(ProductCoOccurrence.product_a_id).union(
        db.query(ProductCoOccurrence.product_b_id)
    ).subquery()
    base_query = db.query(Product).filter(~Product.id.in_(linked_ids)).order_by(Product.id)
    total = base_query.count()
    products = base_query.offset(skip).limit(limit).all()
    return {"total": total, "products": products}


def get_link_stats(db: Session):
    total_products = db.query(func.count(Product.id)).scalar() or 0
    linked_subquery = db.query(ProductCoOccurrence.product_a_id).union(
        db.query(ProductCoOccurrence.product_b_id)
    )
    linked_products = db.query(func.count()).select_from(linked_subquery.subquery()).scalar() or 0
    total_links = db.query(func.count(ProductCoOccurrence.id)).scalar() or 0
    return {
        "total_products": total_products,
        "linked_products": min(linked_products, total_products),
        "unlinked_products": max(total_products - linked_products, 0),
        "total_links": total_links,
    }


def get_user_product_groups(db: Session, limit: int = 50):
    user_ids = [row[0] for row in db.query(UserProduct.user_id).distinct().limit(limit).all()]
    result = []
    for uid in user_ids:
        user = db.query(User).filter(User.id == uid).first()
        products = (
            db.query(Product)
            .join(UserProduct, UserProduct.product_id == Product.id)
            .filter(UserProduct.user_id == uid)
            .all()
        )
        result.append({
            "user_id": uid,
            "undertone": user.undertone if user else None,
            "skin_type": user.skin_type if user else None,
            "total": len(products),
            "products": products,
        })
    return result


def get_all_products_paginated(db: Session, skip: int = 0, limit: int = 100):
    """Возвращает все продукты из базы с пагинацией для админки."""
    total = db.query(func.count(Product.id)).scalar() or 0
    products = db.query(Product).offset(skip).limit(limit).all()
    return {"total": total, "products": products}


def wipe_user_data(db: Session) -> None:
    db.query(UserProduct).delete()
    db.query(Recommendation).delete()
    db.query(User).delete()
    db.commit()


def wipe_co_occurrence_data(db: Session) -> None:
    db.query(ProductCoOccurrence).delete()
    db.query(BlockedCoOccurrence).delete()
    db.commit()
