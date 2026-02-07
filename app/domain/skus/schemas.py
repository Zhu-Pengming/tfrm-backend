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


class CategoryEnum(str, Enum):
    """PRD统一的7大品类"""
    HOTEL = "hotel"
    TRANSPORT = "transport"  # 用车
    ROUTE = "route"  # 线路
    GUIDE = "guide"
    DINING = "dining"  # 餐饮
    TICKET = "ticket"
    ACTIVITY = "activity"


# SKU类型到品类的映射
SKU_TYPE_TO_CATEGORY = {
    "hotel": "hotel",
    "car": "transport",
    "itinerary": "route",
    "guide": "guide",
    "restaurant": "dining",
    "ticket": "ticket",
    "activity": "activity"
}

# 品类到SKU类型的映射（向后兼容）
CATEGORY_TO_SKU_TYPE = {
    "hotel": "hotel",
    "transport": "car",
    "route": "itinerary",
    "guide": "guide",
    "dining": "restaurant",
    "ticket": "ticket",
    "activity": "activity"
}


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


class SeasonalPrice(BaseModel):
    season: str
    daily_price: Decimal
    currency: Optional[str] = "CNY"


class RoomType(BaseModel):
    building: Optional[str] = None
    room_type_name: str
    include_breakfast: Optional[bool] = None
    pricing: List[SeasonalPrice]


class DiningPricing(BaseModel):
    group_size: str
    price_per_person: Decimal
    notes: Optional[str] = None


class DiningOption(BaseModel):
    meal_type: str
    pricing: List[DiningPricing]


class ConferenceRoomPricing(BaseModel):
    duration: str
    price: Decimal


class ConferenceRoom(BaseModel):
    room_name: str
    area_sqm: Optional[int] = None
    capacity: Optional[str] = None
    function: Optional[str] = None
    pricing: List[ConferenceRoomPricing]


class SeasonDefinition(BaseModel):
    peak: Optional[str] = None
    regular: Optional[str] = None
    low: Optional[str] = None


class ContactInfo(BaseModel):
    phone: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    wechat: Optional[str] = None


class HotelAttrs(BaseModel):
    hotel_name: str
    hotel_name_en: Optional[str] = None
    brand: Optional[str] = None
    star_rating: Optional[str] = None
    address: str
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    contact_info: Optional[ContactInfo] = None
    
    # 单房间类型模式（向后兼容）
    room_type_name: Optional[str] = None
    bed_type: Optional[str] = None
    room_area: Optional[int] = None
    max_occupancy: Optional[int] = None
    include_breakfast: Optional[bool] = None
    daily_cost_price: Optional[Decimal] = None
    daily_sell_price: Optional[Decimal] = None
    
    # 复杂酒店模式（多房间类型、餐饮、会议室）
    room_types: Optional[List[RoomType]] = None
    facilities: Optional[List[str]] = None
    dining_options: Optional[List[DiningOption]] = None
    conference_rooms: Optional[List[ConferenceRoom]] = None
    season_definitions: Optional[SeasonDefinition] = None
    booking_notes: Optional[str] = None
    description: Optional[str] = None
    
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
    category: Optional[str] = None  # 新增：统一品类字段
    owner_type: str
    product_id: Optional[str] = None
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    destination_country: Optional[str] = None
    destination_city: Optional[str] = None
    
    # 统一标签体系
    tags: Optional[List[str]] = None  # 保留向后兼容
    tags_interest: Optional[List[str]] = None  # 兴趣标签
    tags_service: Optional[Dict[str, Any]] = None  # 服务标签
    
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
    
    # 双字段支持：attributes（新）和 attrs（旧）
    attributes: Optional[Dict[str, Any]] = None  # 新的统一属性字段
    attrs: Optional[Dict[str, Any]] = None  # 保留向后兼容
    
    # 价格字段
    base_cost_price: Optional[Decimal] = None
    base_sale_price: Optional[Decimal] = None
    
    # 公共库相关
    is_public: Optional[bool] = False
    publish_to_public: Optional[bool] = False  # AI导入时的意图标记
    
    # AI导入原始数据
    raw_extracted: Optional[Dict[str, Any]] = None  # 完整的AI提取数据
    
    media: Optional[List[Dict[str, str]]] = None
    
    @validator('category', always=True)
    def set_category_from_sku_type(cls, v, values):
        if v:
            return v
        if 'sku_type' in values:
            return SKU_TYPE_TO_CATEGORY.get(values['sku_type'].value, values['sku_type'].value)
        return None
    
    @validator('attributes', always=True)
    def merge_attrs_to_attributes(cls, v, values):
        # 如果提供了attributes就用attributes，否则用attrs
        if v:
            return v
        if 'attrs' in values and values['attrs']:
            return values['attrs']
        return {}
    
    @validator('attrs')
    def validate_attrs_field(cls, v, values):
        if not v:
            return v
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
    raw_extracted: Optional[Dict[str, Any]] = None  # AI导入原始数据
    media: Optional[List[Dict[str, str]]] = None


class SKUResponse(BaseModel):
    id: str
    agency_id: str
    product_id: Optional[str]
    sku_name: str
    sku_type: str
    category: Optional[str]  # 新增统一品类
    status: str
    owner_type: str
    
    # 双库字段
    is_public: Optional[bool] = False
    public_status: Optional[str] = "none"
    source_org_id: Optional[str] = None
    source_sku_id: Optional[str] = None
    
    supplier_id: Optional[str]
    supplier_name: Optional[str]
    destination_country: Optional[str]
    destination_city: Optional[str]
    
    # 标签体系
    tags: Optional[List[str]]
    tags_interest: Optional[List[str]]
    tags_service: Optional[Dict[str, Any]]
    
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
    
    # 双属性字段
    attributes: Optional[Dict[str, Any]]  # 新字段
    attrs: Dict[str, Any]  # 保留兼容
    
    # 价格字段
    base_cost_price: Optional[float]
    base_sale_price: Optional[float]
    
    # AI导入原始数据
    raw_extracted: Optional[Dict[str, Any]]
    
    media: Optional[List[Dict[str, str]]]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
