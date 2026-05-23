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
    
    class Config:
        from_attributes = True


# Search schemas
class SearchRequest(BaseModel):
    query: Optional[str] = Field(default=None, min_length=1, max_length=100)
    brand: Optional[str] = Field(default=None, max_length=100)
    model: Optional[str] = Field(default=None, max_length=100)
    shade: Optional[str] = Field(default=None, max_length=100)
    limit: int = Field(default=10, ge=1, le=50)


class SearchResponse(BaseModel):
    products: List[ProductResponse]
    total: int
