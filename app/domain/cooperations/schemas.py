from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CooperationCreate(BaseModel):
    """发起合作申请"""
    to_agency_id: str
    request_message: Optional[str] = None


class CooperationApprove(BaseModel):
    """审核合作申请"""
    response_message: Optional[str] = None


class CooperationResponse(BaseModel):
    """合作关系响应"""
    id: str
    from_agency_id: str
    to_agency_id: str
    status: str  # pending|approved|rejected|expired|terminated
    request_message: Optional[str]
    response_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    expired_at: Optional[datetime]
    approved_at: Optional[datetime]
    terminated_at: Optional[datetime]
    created_by: Optional[str]
    reviewed_by: Optional[str]
    
    class Config:
        from_attributes = True


class PublicSKUQuery(BaseModel):
    """公共库查询参数"""
    city: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    keyword: Optional[str] = None
    skip: int = 0
    limit: int = 50


class SKUPublishRequest(BaseModel):
    """发布SKU到公共库"""
    sku_id: str
    publish_to_public: bool = True
