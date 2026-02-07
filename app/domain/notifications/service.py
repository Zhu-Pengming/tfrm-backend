from sqlalchemy.orm import Session
from app.infra.db import Notification, scoped_query
from typing import Optional, List
from datetime import datetime


class NotificationService:
    """通知服务"""
    
    @staticmethod
    def list_notifications(
        db: Session,
        agency_id: str,
        user_id: Optional[str] = None,
        type: Optional[str] = None,
        is_read: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Notification]:
        """查询通知列表"""
        query = scoped_query(db, Notification, agency_id)
        
        if user_id:
            query = query.filter(
                (Notification.user_id == user_id) | (Notification.user_id == None)
            )
        
        if type:
            query = query.filter(Notification.type == type)
        
        if is_read is not None:
            query = query.filter(Notification.is_read == is_read)
        
        query = query.order_by(Notification.created_at.desc())
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def mark_as_read(
        db: Session,
        agency_id: str,
        notification_ids: List[str]
    ) -> int:
        """标记通知为已读"""
        query = scoped_query(db, Notification, agency_id).filter(
            Notification.id.in_(notification_ids),
            Notification.is_read == False
        )
        
        count = query.update({
            "is_read": True,
            "read_at": datetime.utcnow()
        }, synchronize_session=False)
        
        db.commit()
        
        return count
    
    @staticmethod
    def get_unread_count(
        db: Session,
        agency_id: str,
        user_id: Optional[str] = None
    ) -> int:
        """获取未读通知数量"""
        query = scoped_query(db, Notification, agency_id).filter(
            Notification.is_read == False
        )
        
        if user_id:
            query = query.filter(
                (Notification.user_id == user_id) | (Notification.user_id == None)
            )
        
        return query.count()
