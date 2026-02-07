from sqlalchemy import create_engine, Column, String, Integer, DateTime, Boolean, JSON, Numeric, Date, Text, Enum as SQLEnum, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional
from app.config import get_settings
import enum

settings = get_settings()

database_url = settings.database_url
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def scoped_query(db: Session, model, agency_id: str):
    return db.query(model).filter(model.agency_id == agency_id)


class OwnerType(str, enum.Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class SKUType(str, enum.Enum):
    HOTEL = "hotel"
    CAR = "car"
    ITINERARY = "itinerary"
    GUIDE = "guide"
    RESTAURANT = "restaurant"
    TICKET = "ticket"
    ACTIVITY = "activity"


class SKUStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class ImportStatus(str, enum.Enum):
    CREATED = "created"
    UPLOADED = "uploaded"
    PARSING = "parsing"
    PARSED = "parsed"
    CONFIRMED = "confirmed"
    FAILED = "failed"


class Agency(Base):
    __tablename__ = "agencies"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(String)
    contact_name = Column(String)
    contact_phone = Column(String)
    contact_wechat = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    agency_id = Column(String, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String)
    wechat_openid = Column(String, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(String, primary_key=True)
    agency_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    contact_name = Column(String)
    contact_phone = Column(String)
    contact_wechat = Column(String)
    settlement_method = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True)
    agency_id = Column(String, nullable=False, index=True)

    title = Column(String, nullable=False)
    product_type = Column(String, nullable=True)  # hotel/itinerary/activity etc.
    destination_country = Column(String, index=True)
    destination_city = Column(String, index=True)
    tags = Column(ARRAY(String), index=True)

    description = Column(Text)
    highlights = Column(ARRAY(String))
    media = Column(JSON, default=[])

    valid_from = Column(Date)
    valid_to = Column(Date)

    created_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SKU(Base):
    __tablename__ = "skus"
    
    id = Column(String, primary_key=True)
    agency_id = Column(String, nullable=False, index=True)
    product_id = Column(String, index=True)
    sku_name = Column(String, nullable=False)
    
    # Unified category field (7 categories)
    category = Column(String, nullable=False, index=True)  # hotel|transport|route|guide|dining|ticket|activity
    sku_type = Column(SQLEnum(SKUType), nullable=False, index=True)  # Keep for backward compatibility
    
    status = Column(SQLEnum(SKUStatus), default=SKUStatus.ACTIVE, index=True)
    owner_type = Column(SQLEnum(OwnerType), nullable=False, index=True)
    
    # Dual-library fields
    is_public = Column(Boolean, default=False, index=True)
    public_status = Column(String, default="none", index=True)  # none|pending|published|removed
    source_org_id = Column(String, index=True)  # Original agency_id if copied from public library
    source_sku_id = Column(String, index=True)  # Original SKU id if copied
    
    supplier_id = Column(String, index=True)
    supplier_name = Column(String)
    
    destination_country = Column(String, index=True)
    destination_city = Column(String, index=True)
    
    # Unified tag system
    tags = Column(ARRAY(String), index=True)  # Legacy field
    tags_interest = Column(ARRAY(String), index=True)  # 兴趣标签: 美食/亲子/徒步/茶艺/咖啡/漂流/自行车
    tags_service = Column(JSON, default={})  # 服务标签: {language: [中/英/泰], duration: X, location: Y}
    
    valid_from = Column(Date)
    valid_to = Column(Date)
    booking_advance = Column(Integer)
    cancel_policy = Column(Text)
    include_items = Column(Text)
    exclude_items = Column(Text)
    
    description = Column(Text)
    highlights = Column(ARRAY(String))
    inclusions = Column(ARRAY(String))
    exclusions = Column(ARRAY(String))
    cancellation_policy = Column(Text)
    
    # Category-specific attributes (JSONB for 7 categories)
    attributes = Column(JSON, nullable=False, default={})  # New unified attributes field
    attrs = Column(JSON, nullable=False, default={})  # Keep for backward compatibility
    
    # AI Import raw data
    raw_extracted = Column(JSON)  # Complete extracted data from AI import (room_types, dining_options, etc.)
    
    # Price fields
    price_mode = Column(String)  # fixed / calendar / ruled
    base_cost_price = Column(Numeric(10, 2))  # 供应商成本价
    base_sale_price = Column(Numeric(10, 2))  # 供应商对外基准价
    calendar_prices = Column(JSON)  # date -> price
    price_rules = Column(JSON)  # list of rules (weekend +delta 等)
    
    media = Column(JSON, default=[])
    
    visibility_scope = Column(String, default="all")
    partner_whitelist = Column(ARRAY(String))
    
    applied_factor_id = Column(String)
    
    created_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PricingFactor(Base):
    __tablename__ = "pricing_factors"
    
    id = Column(String, primary_key=True)
    agency_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    
    apply_to_sku_types = Column(ARRAY(String))
    apply_to_cities = Column(ARRAY(String))
    apply_to_tags = Column(ARRAY(String))
    apply_to_suppliers = Column(ARRAY(String))
    
    multiply_factor = Column(Numeric(10, 4), default=1.0)
    add_amount = Column(Numeric(10, 2), default=0.0)
    
    priority = Column(Integer, default=0)
    
    valid_from = Column(Date)
    valid_to = Column(Date)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ImportTask(Base):
    __tablename__ = "import_tasks"
    
    id = Column(String, primary_key=True)
    agency_id = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=False)
    
    status = Column(SQLEnum(ImportStatus), default=ImportStatus.CREATED, index=True)
    
    input_text = Column(Text)
    input_files = Column(JSON, default=[])
    
    parsed_result = Column(JSON)
    extracted_fields = Column(JSON)
    confidence = Column(JSON)
    evidence = Column(JSON)
    
    error_message = Column(Text)
    
    created_sku_id = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Quotation(Base):
    __tablename__ = "quotations"
    
    id = Column(String, primary_key=True)
    agency_id = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=False)
    
    title = Column(String, nullable=False)
    customer_name = Column(String)
    customer_contact = Column(String)
    
    total_amount = Column(Numeric(10, 2))
    discount_amount = Column(Numeric(10, 2), default=0.0)
    final_amount = Column(Numeric(10, 2))
    
    notes = Column(Text)
    
    status = Column(String, default="draft")
    
    published_at = Column(DateTime)
    published_url = Column(String)
    share_token = Column(String, unique=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QuotationItem(Base):
    __tablename__ = "quotation_items"
    
    id = Column(String, primary_key=True)
    quotation_id = Column(String, nullable=False, index=True)
    
    sku_id = Column(String, nullable=False)
    
    snapshot = Column(JSON, nullable=False)
    
    quantity = Column(Integer, default=1)
    unit_price = Column(Numeric(10, 2))
    subtotal = Column(Numeric(10, 2))
    
    custom_title = Column(String)
    custom_description = Column(Text)
    custom_notes = Column(Text)
    
    sort_order = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class Vendor(Base):
    __tablename__ = "vendors"
    
    id = Column(String, primary_key=True)
    agency_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    logo = Column(String)
    contact = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=False)
    category = Column(ARRAY(String), nullable=False)
    specialties = Column(ARRAY(String), nullable=False)
    status = Column(String, default="Active", index=True)
    rating = Column(Numeric(3, 1), default=5.0)
    address = Column(Text)
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CooperationRelation(Base):
    """合作关系表：机构间的合作申请与审核"""
    __tablename__ = "cooperation_relations"
    
    id = Column(String, primary_key=True)
    from_agency_id = Column(String, nullable=False, index=True)  # 申请方
    to_agency_id = Column(String, nullable=False, index=True)    # 被申请方（资源提供方）
    
    status = Column(String, nullable=False, index=True)  # pending|approved|rejected|expired|terminated
    
    request_message = Column(Text)  # 申请说明
    response_message = Column(Text)  # 审核回复
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expired_at = Column(DateTime)  # 申请超时时间
    approved_at = Column(DateTime)  # 审核通过时间
    terminated_at = Column(DateTime)  # 终止时间
    
    created_by = Column(String)  # 申请人user_id
    reviewed_by = Column(String)  # 审核人user_id


class CooperationSKUPrice(Base):
    """合作SKU价格表：针对特定合作方的协商价"""
    __tablename__ = "cooperation_sku_prices"
    
    id = Column(String, primary_key=True)
    sku_id = Column(String, nullable=False, index=True)
    provider_agency_id = Column(String, nullable=False, index=True)  # 供应商
    consumer_agency_id = Column(String, nullable=False, index=True)  # 采购方
    
    partner_cost_price = Column(Numeric(10, 2))  # 给合作方的成本价
    partner_sale_price = Column(Numeric(10, 2))  # 给合作方的销售价
    
    markup_factor = Column(Numeric(10, 4), default=1.0)  # 采购方的加价倍率
    markup_amount = Column(Numeric(10, 2), default=0.0)  # 采购方的加价金额
    
    valid_from = Column(Date)
    valid_to = Column(Date)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Notification(Base):
    """站内通知表：合作变更、SKU更新等通知"""
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True)
    agency_id = Column(String, nullable=False, index=True)  # 接收方
    user_id = Column(String, index=True)  # 具体接收人（可选）
    
    type = Column(String, nullable=False, index=True)  # cooperation_change|sku_update|system
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    
    related_entity_type = Column(String)  # cooperation|sku|quotation
    related_entity_id = Column(String, index=True)
    
    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True)
    agency_id = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=False, index=True)
    
    action = Column(String, nullable=False, index=True)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False, index=True)
    
    before_data = Column(JSON)
    after_data = Column(JSON)
    
    ip_address = Column(String)
    user_agent = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


def init_db():
    Base.metadata.create_all(bind=engine)
