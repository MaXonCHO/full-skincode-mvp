from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# User schemas
class UserBase(BaseModel):
    undertone: Optional[str] = None
    skin_type: Optional[str] = None


class UserCreate(UserBase):
    anonymous_id: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    anonymous_id: Optional[str] = None
    undertone: Optional[str] = None
    skin_type: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# Product schemas
class ProductBase(BaseModel):
    brand: str
    line: str
    shade: str
    hex: Optional[str] = None
    image_url: Optional[str] = None
    product_url: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# UserProduct schemas
class UserProductBase(BaseModel):
    user_id: int
    product_id: int


class UserProductCreate(BaseModel):
    product_id: int


class UserProductResponse(BaseModel):
    id: int
    user_id: int
    product_id: int
    created_at: datetime
    product: ProductResponse
    
    class Config:
        from_attributes = True


class UserProductAddedResponse(BaseModel):
    """Ответ после добавления продукта (без вложенного product — меньше ошибок сериализации)."""
    id: int
    user_id: int
    product_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Recommendation schemas
class RecommendationRequest(BaseModel):
    user_id: int
    undertone: Optional[str] = None
    skin_type: Optional[str] = None
    product_ids: List[int]


class RecommendationResponse(BaseModel):
    id: int
    product_id: int
    score: float
    rank: int
    product: ProductResponse
    support_count: Optional[int] = None
    confidence_label: Optional[str] = None
    match_ratio: Optional[float] = None
    
    class Config:
        from_attributes = True


# Search schemas
class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=100)
    limit: int = Field(default=10, ge=1, le=50)


class SearchResponse(BaseModel):
    products: List[ProductResponse]
    total: int


# Admin schemas
class CoOccurrenceBase(BaseModel):
    product_a_id: int
    product_b_id: int
    co_occurrence_count: int = Field(default=1, ge=0)


class CoOccurrenceCreate(CoOccurrenceBase):
    pass


class CoOccurrenceUpdate(BaseModel):
    co_occurrence_count: int = Field(..., ge=0)


class CoOccurrenceResponse(BaseModel):
    id: int
    co_occurrence_count: int
    updated_at: datetime
    product_a: ProductResponse
    product_b: ProductResponse

    class Config:
        from_attributes = True


class GapProductsResponse(BaseModel):
    total: int
    products: List[ProductResponse]


class LinkStatsResponse(BaseModel):
    total_products: int
    linked_products: int
    unlinked_products: int
    total_links: int


class AdminUserProducts(BaseModel):
    user_id: int
    total: int
    products: List[ProductResponse]

    class Config:
        from_attributes = True


class AdminUserProductsResponse(BaseModel):
    total_users: int
    items: List[AdminUserProducts]
