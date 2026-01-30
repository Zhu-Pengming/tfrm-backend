from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from decimal import Decimal


class PriceCalendarItem(BaseModel):
    date: date
    cost_price: Decimal
    sales_price: Decimal
    inventory: Optional[int] = None
    is_available: bool = True


class PriceCalendarUpdate(BaseModel):
    items: List[PriceCalendarItem]


class BatchPricingUpdate(BaseModel):
    sku_ids: List[str]
    margin_percentage: Optional[float] = None
    multiply_factor: Optional[float] = None
    add_amount: Optional[Decimal] = None


class BatchSKUUpdate(BaseModel):
    sku_ids: List[str]
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    supplier_id: Optional[str] = None


class BatchSKUDelete(BaseModel):
    sku_ids: List[str]


class AvailabilityItem(BaseModel):
    date: date
    base_price: float
    final_price: float
    price_source: str
    rule_applied: Optional[dict] = None
    factor_applied: Optional[str] = None


class AvailabilityResponse(BaseModel):
    sku_id: str
    currency: str = "CNY"
    items: List[AvailabilityItem]
