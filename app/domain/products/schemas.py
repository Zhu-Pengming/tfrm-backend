from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, field_serializer
from app.domain.skus.schemas import SKUResponse


class ProductBase(BaseModel):
    title: str
    product_type: Optional[str] = None
    destination_country: Optional[str] = None
    destination_city: Optional[str] = None
    tags: Optional[List[str]] = None
    description: Optional[str] = None
    highlights: Optional[List[str]] = None
    media: Optional[List[Dict[str, Any]]] = None
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None


class ProductCreate(ProductBase):
    title: str


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    product_type: Optional[str] = None
    destination_country: Optional[str] = None
    destination_city: Optional[str] = None
    tags: Optional[List[str]] = None
    description: Optional[str] = None
    highlights: Optional[List[str]] = None
    media: Optional[List[Dict[str, Any]]] = None
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None


class ProductResponse(ProductBase):
    id: str
    agency_id: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    skus: Optional[List[SKUResponse]] = None

    class Config:
        from_attributes = True
