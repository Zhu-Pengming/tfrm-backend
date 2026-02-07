from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationResponse(BaseModel):
    """通知响应"""
    id: str
    agency_id: str
    user_id: Optional[str]
    type: str
    title: str
    content: str
    related_entity_type: Optional[str]
    related_entity_id: Optional[str]
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class NotificationMarkRead(BaseModel):
    """标记通知为已读"""
    notification_ids: list[str]
