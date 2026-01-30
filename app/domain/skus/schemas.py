from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


class PriceMode(str, Enum):
    FIXED = "fixed"
    CALENDAR = "calendar"
    RULED = "ruled"


class PriceRule(BaseModel):
    """规则加价：如周末 +300、节假日 +500。"""
    rule: str  # e.g., "weekend", "holiday", "peak_season"
    delta_amount: Decimal = Decimal("0.0")
    currency: Optional[str] = "CNY"


class SKUTypeEnum(str, Enum):
    HOTEL = "hotel"
    CAR = "car"
    ITINERARY = "itinerary"
    GUIDE = "guide"
    RESTAURANT = "restaurant"
    TICKET = "ticket"
    ACTIVITY = "activity"


# 前端到后端的分类映射
FRONTEND_TO_BACKEND_CATEGORY = {
    "Hotel": "hotel",
    "Transport": "car",
    "Ticket": "ticket",
    "Guide": "guide",
    "Catering": "restaurant",
    "Activity": "activity",
    "Route": "itinerary"
}

# 后端到前端的分类映射
BACKEND_TO_FRONTEND_CATEGORY = {
    "hotel": "Hotel",
    "car": "Transport",
    "ticket": "Ticket",
    "guide": "Guide",
    "restaurant": "Catering",
    "activity": "Activity",
    "itinerary": "Route"
}


class HotelAttrs(BaseModel):
    hotel_name: str
    hotel_name_en: Optional[str] = None
    brand: Optional[str] = None
    star_rating: Optional[str] = None
    address: str
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    room_type_name: str
    bed_type: Optional[str] = None
    room_area: Optional[int] = None
    max_occupancy: Optional[int] = None
    include_breakfast: Optional[bool] = None
    daily_cost_price: Optional[Decimal] = None
    daily_sell_price: Optional[Decimal] = None
    currency: Optional[str] = "CNY"
    price_calendar: Optional[Dict[str, Decimal]] = None
    refundable: Optional[bool] = None
    free_cancel_before: Optional[datetime] = None
    blackout_dates: Optional[List[date]] = None


class CarAttrs(BaseModel):
    car_type: str
    seats: int
    service_mode: str
    service_hours: Optional[int] = None
    driver_language: Optional[List[str]] = None
    pickup_location: Optional[str] = None
    dropoff_location: Optional[str] = None
    cost_price: Optional[Decimal] = None
    sell_price: Optional[Decimal] = None
    available_dates: Optional[List[date]] = None


class ItineraryAttrs(BaseModel):
    itinerary_name: str
    days: int
    nights: Optional[int] = None
    depart_city: str
    arrive_city: Optional[str] = None
    itinerary_type: Optional[str] = None
    departure_dates: Optional[List[date]] = None
    min_pax: Optional[int] = None
    max_pax: Optional[int] = None
    route_stops: Optional[List[str]] = None
    service_guarantees: Optional[List[str]] = None
    experience_themes: Optional[List[str]] = None
    duration_days: Optional[int] = None
    duration_nights: Optional[int] = None
    price_mode: Optional[PriceMode] = PriceMode.FIXED
    calendar_prices: Optional[Dict[str, Decimal]] = None  # date -> price
    price_rules: Optional[List[PriceRule]] = None
    adult_price: Optional[Decimal] = None
    child_price: Optional[Decimal] = None
    single_supplement: Optional[Decimal] = None
    day_by_day: Optional[List[Dict[str, Any]]] = None
    highlight: Optional[str] = None


class GuideAttrs(BaseModel):
    guide_name: str
    gender: Optional[str] = None
    languages: List[str]
    grade: Optional[str] = None
    expertise_tags: Optional[List[str]] = None
    service_city: Optional[str] = None
    daily_cost_price: Optional[Decimal] = None
    daily_sell_price: Optional[Decimal] = None
    contact_phone: Optional[str] = None
    wechat_id: Optional[str] = None


class RestaurantAttrs(BaseModel):
    restaurant_name: str
    cuisine_type: Optional[str] = None
    meal_type: str
    location: Optional[str] = None
    per_person_price: Optional[Decimal] = None
    min_pax: Optional[int] = None
    max_pax: Optional[int] = None
    set_menu_desc: Optional[str] = None
    booking_time_slots: Optional[List[str]] = None


class TicketAttrs(BaseModel):
    attraction_name: str
    ticket_type: str
    entry_method: str
    valid_type: Optional[str] = None
    valid_days: Optional[int] = None
    visit_time_range: Optional[str] = None
    need_real_name: Optional[bool] = None
    real_name_fields: Optional[List[str]] = None
    cost_price: Optional[Decimal] = None
    sell_price: Optional[Decimal] = None


class ActivityAttrs(BaseModel):
    activity_name: str
    category: Optional[str] = None
    duration_hours: Optional[Decimal] = None
    duration_days: Optional[int] = None
    duration_nights: Optional[int] = None
    language_service: Optional[List[str]] = None
    difficulty_level: Optional[str] = None
    meeting_point: Optional[str] = None
    route_stops: Optional[List[str]] = None
    start_time_slots: Optional[List[str]] = None
    min_pax: Optional[int] = None
    max_pax: Optional[int] = None
    experience_themes: Optional[List[str]] = None  # 文化/族群体验：纳西/马帮/盐帮
    service_guarantees: Optional[List[str]] = None  # 2-7人小团/自有车队/24h管家
    price_mode: Optional[PriceMode] = PriceMode.FIXED
    calendar_prices: Optional[Dict[str, Decimal]] = None
    price_rules: Optional[List[PriceRule]] = None
    cost_price: Optional[Decimal] = None
    sell_price: Optional[Decimal] = None


ATTRS_VALIDATORS = {
    SKUTypeEnum.HOTEL: HotelAttrs,
    SKUTypeEnum.CAR: CarAttrs,
    SKUTypeEnum.ITINERARY: ItineraryAttrs,
    SKUTypeEnum.GUIDE: GuideAttrs,
    SKUTypeEnum.RESTAURANT: RestaurantAttrs,
    SKUTypeEnum.TICKET: TicketAttrs,
    SKUTypeEnum.ACTIVITY: ActivityAttrs,
}


def validate_attrs(sku_type: str, attrs: Dict[str, Any]) -> Dict[str, Any]:
    sku_type_enum = SKUTypeEnum(sku_type)
    validator_class = ATTRS_VALIDATORS.get(sku_type_enum)
    if not validator_class:
        raise ValueError(f"No validator for sku_type: {sku_type}")
    validated = validator_class(**attrs)
    result = validated.model_dump(exclude_none=True)
    
    # Convert Decimal to float for JSON serialization
    def convert_decimals(obj):
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, dict):
            return {k: convert_decimals(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_decimals(item) for item in obj]
        return obj
    
    return convert_decimals(result)


class SKUCreate(BaseModel):
    sku_name: str
    sku_type: SKUTypeEnum
    owner_type: str
    product_id: Optional[str] = None
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    destination_country: Optional[str] = None
    destination_city: Optional[str] = None
    tags: Optional[List[str]] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    booking_advance: Optional[int] = None
    cancel_policy: Optional[str] = None
    include_items: Optional[str] = None
    exclude_items: Optional[str] = None
    description: Optional[str] = None
    highlights: Optional[List[str]] = None
    inclusions: Optional[List[str]] = None
    exclusions: Optional[List[str]] = None
    cancellation_policy: Optional[str] = None
    price_mode: Optional[PriceMode] = None
    calendar_prices: Optional[Dict[str, Decimal]] = None
    price_rules: Optional[List[PriceRule]] = None
    attrs: Dict[str, Any]
    media: Optional[List[Dict[str, str]]] = None
    
    @validator('attrs')
    def validate_attrs_field(cls, v, values):
        if 'sku_type' in values:
            return validate_attrs(values['sku_type'], v)
        return v


class SKUUpdate(BaseModel):
    sku_name: Optional[str] = None
    status: Optional[str] = None
    product_id: Optional[str] = None
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    destination_country: Optional[str] = None
    destination_city: Optional[str] = None
    tags: Optional[List[str]] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    booking_advance: Optional[int] = None
    cancel_policy: Optional[str] = None
    include_items: Optional[str] = None
    exclude_items: Optional[str] = None
    description: Optional[str] = None
    highlights: Optional[List[str]] = None
    inclusions: Optional[List[str]] = None
    exclusions: Optional[List[str]] = None
    cancellation_policy: Optional[str] = None
    price_mode: Optional[PriceMode] = None
    calendar_prices: Optional[Dict[str, Decimal]] = None
    price_rules: Optional[List[PriceRule]] = None
    attrs: Optional[Dict[str, Any]] = None
    media: Optional[List[Dict[str, str]]] = None


class SKUResponse(BaseModel):
    id: str
    agency_id: str
    product_id: Optional[str]
    sku_name: str
    sku_type: str
    status: str
    owner_type: str
    supplier_id: Optional[str]
    supplier_name: Optional[str]
    destination_country: Optional[str]
    destination_city: Optional[str]
    tags: Optional[List[str]]
    valid_from: Optional[date]
    valid_to: Optional[date]
    description: Optional[str]
    highlights: Optional[List[str]]
    inclusions: Optional[List[str]]
    exclusions: Optional[List[str]]
    cancellation_policy: Optional[str]
    price_mode: Optional[str]
    calendar_prices: Optional[Dict[str, float]]
    price_rules: Optional[List[Dict[str, Any]]]
    attrs: Dict[str, Any]
    media: Optional[List[Dict[str, str]]]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
