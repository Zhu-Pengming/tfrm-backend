from pydantic import BaseModel, field_serializer
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal


class QuotationItemCreate(BaseModel):
    sku_id: str
    quantity: int = 1
    custom_title: Optional[str] = None
    custom_description: Optional[str] = None
    custom_notes: Optional[str] = None


class QuotationCreate(BaseModel):
    title: str
    customer_name: Optional[str] = None
    customer_contact: Optional[str] = None
    items: List[QuotationItemCreate]
    notes: Optional[str] = None


class QuotationItemResponse(BaseModel):
    id: str
    quotation_id: str
    sku_id: str
    snapshot: Dict[str, Any]
    quantity: int
    unit_price: Optional[Decimal]
    subtotal: Optional[Decimal]
    custom_title: Optional[str]
    custom_description: Optional[str]
    custom_notes: Optional[str]
    
    @field_serializer('unit_price', 'subtotal')
    def serialize_decimal(self, value: Optional[Decimal]) -> Optional[float]:
        return float(value) if value is not None else None
    
    class Config:
        from_attributes = True


class QuotationResponse(BaseModel):
    id: str
    agency_id: str
    user_id: str
    title: str
    customer_name: Optional[str]
    customer_contact: Optional[str]
    total_amount: Optional[Decimal]
    discount_amount: Optional[Decimal]
    final_amount: Optional[Decimal]
    notes: Optional[str]
    status: str
    published_at: Optional[datetime]
    published_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    @field_serializer('total_amount', 'discount_amount', 'final_amount')
    def serialize_decimal(self, value: Optional[Decimal]) -> Optional[float]:
        return float(value) if value is not None else None
    
    class Config:
        from_attributes = True


class QuotationUpdate(BaseModel):
    title: Optional[str] = None
    customer_name: Optional[str] = None
    customer_contact: Optional[str] = None
    discount_amount: Optional[Decimal] = None
    notes: Optional[str] = None
