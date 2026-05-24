from sqlalchemy import Column, Integer, String, DateTime, Float, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    anonymous_id = Column(String(255), unique=True, index=True, nullable=True)
    undertone = Column(String(50), nullable=True)  # warm, cool, neutral, olive
    skin_type = Column(String(50), nullable=True)  # dry, oily, combination, normal
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user_products = relationship("UserProduct", back_populates="user", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="user", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    brand = Column(String(255), index=True, nullable=False)
    line = Column(String(255), index=True, nullable=False)
    shade = Column(String(255), nullable=False)
    hex = Column(String(7), nullable=True)
    image_url = Column(Text, nullable=True)
    product_url = Column(Text, nullable=True)
    price = Column(Float, nullable=True)
    category = Column(String(50), index=True, nullable=True)  # light_warm, medium_neutral, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Composite index for brand + line + shade
    __table_args__ = (
        Index('idx_brand_line_shade', 'brand', 'line', 'shade'),
        Index('idx_category', 'category'),
    )
    
    # Relationships
    user_products = relationship("UserProduct", back_populates="product", cascade="all, delete-orphan")
    co_occurrences_as_product_a = relationship("ProductCoOccurrence", foreign_keys="ProductCoOccurrence.product_a_id", back_populates="product_a")
    co_occurrences_as_product_b = relationship("ProductCoOccurrence", foreign_keys="ProductCoOccurrence.product_b_id", back_populates="product_b")


class UserProduct(Base):
    __tablename__ = "user_products"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(String(36), nullable=True, index=True)  # UUID сессии, группирует продукты одной связки
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="user_products")
    product = relationship("Product", back_populates="user_products")
    
    # Unique per (user, product, session) — один и тот же продукт может быть в разных связках
    __table_args__ = (
        Index('idx_user_product_session_unique', 'user_id', 'product_id', 'session_id', unique=True),
    )


class ProductCoOccurrence(Base):
    """
    Таблица для хранения co-occurrence данных между продуктами.
    Используется для collaborative filtering.
    """
    __tablename__ = "product_co_occurrences"
    
    id = Column(Integer, primary_key=True, index=True)
    product_a_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    product_b_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    co_occurrence_count = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    product_a = relationship("Product", foreign_keys=[product_a_id], back_populates="co_occurrences_as_product_a")
    product_b = relationship("Product", foreign_keys=[product_b_id], back_populates="co_occurrences_as_product_b")
    
    # Unique constraint for product pair (order doesn't matter)
    __table_args__ = (
        Index('idx_product_pair_unique', 'product_a_id', 'product_b_id', unique=True),
    )


class Recommendation(Base):
    """
    Таблица для хранения рекомендаций для пользователей.
    Позволяет анализировать качество рекомендаций и кэшировать результаты.
    """
    __tablename__ = "recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=False)  # финальный score рекомендации
    rank = Column(Integer, nullable=False)  # позиция в топе (1-5)
    co_occurrence_score = Column(Float, default=0)
    undertone_match_score = Column(Float, default=0)
    skin_type_match_score = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="recommendations")
    
    __table_args__ = (
        Index('idx_user_recommendations', 'user_id', 'rank'),
    )
