from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from models import User, Product, UserProduct, Recommendation
from schemas import UserCreate, ProductCreate, UserProductCreate
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
