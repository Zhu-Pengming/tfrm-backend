from sqlalchemy.orm import Session
from app.infra.db import CooperationRelation, SKU, scoped_query, Notification
from app.domain.cooperations.schemas import CooperationCreate, CooperationApprove
from app.infra.audit import audit_log
from typing import Optional, List
import uuid
from datetime import datetime, timedelta


class CooperationService:
    """合作关系服务：处理机构间的合作申请、审核、SKU共享"""
    
    @staticmethod
    def create_cooperation_request(
        db: Session,
        from_agency_id: str,
        user_id: str,
        request_data: CooperationCreate
    ) -> CooperationRelation:
        """发起合作申请"""
        # Check if cooperation already exists
        existing = db.query(CooperationRelation).filter(
            CooperationRelation.from_agency_id == from_agency_id,
            CooperationRelation.to_agency_id == request_data.to_agency_id,
            CooperationRelation.status.in_(["pending", "approved"])
        ).first()
        
        if existing:
            raise ValueError("Cooperation request already exists")
        
        coop_id = f"COOP-{uuid.uuid4().hex[:12].upper()}"
        
        cooperation = CooperationRelation(
            id=coop_id,
            from_agency_id=from_agency_id,
            to_agency_id=request_data.to_agency_id,
            status="pending",
            request_message=request_data.request_message,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            expired_at=datetime.utcnow() + timedelta(days=7),  # 7天超时
            created_by=user_id
        )
        
        db.add(cooperation)
        db.commit()
        db.refresh(cooperation)
        
        # Create notification for target agency
        CooperationService._create_notification(
            db=db,
            agency_id=request_data.to_agency_id,
            type="cooperation_change",
            title="新的合作申请",
            content=f"机构 {from_agency_id} 向您发起了合作申请",
            related_entity_type="cooperation",
            related_entity_id=coop_id
        )
        
        audit_log(
            db=db,
            agency_id=from_agency_id,
            user_id=user_id,
            action="cooperation.create",
            entity_type="cooperation",
            entity_id=coop_id,
            after_data={"to_agency_id": request_data.to_agency_id, "status": "pending"}
        )
        
        return cooperation
    
    @staticmethod
    def approve_cooperation(
        db: Session,
        agency_id: str,
        user_id: str,
        cooperation_id: str,
        approve_data: CooperationApprove
    ) -> Optional[CooperationRelation]:
        """审核通过合作申请"""
        cooperation = db.query(CooperationRelation).filter(
            CooperationRelation.id == cooperation_id,
            CooperationRelation.to_agency_id == agency_id,
            CooperationRelation.status == "pending"
        ).first()
        
        if not cooperation:
            return None
        
        cooperation.status = "approved"
        cooperation.response_message = approve_data.response_message
        cooperation.approved_at = datetime.utcnow()
        cooperation.updated_at = datetime.utcnow()
        cooperation.reviewed_by = user_id
        
        db.commit()
        db.refresh(cooperation)
        
        # Notify applicant
        CooperationService._create_notification(
            db=db,
            agency_id=cooperation.from_agency_id,
            type="cooperation_change",
            title="合作申请已通过",
            content=f"您向机构 {agency_id} 的合作申请已通过",
            related_entity_type="cooperation",
            related_entity_id=cooperation_id
        )
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="cooperation.approve",
            entity_type="cooperation",
            entity_id=cooperation_id,
            after_data={"status": "approved"}
        )
        
        return cooperation
    
    @staticmethod
    def reject_cooperation(
        db: Session,
        agency_id: str,
        user_id: str,
        cooperation_id: str,
        approve_data: CooperationApprove
    ) -> Optional[CooperationRelation]:
        """拒绝合作申请"""
        cooperation = db.query(CooperationRelation).filter(
            CooperationRelation.id == cooperation_id,
            CooperationRelation.to_agency_id == agency_id,
            CooperationRelation.status == "pending"
        ).first()
        
        if not cooperation:
            return None
        
        cooperation.status = "rejected"
        cooperation.response_message = approve_data.response_message
        cooperation.updated_at = datetime.utcnow()
        cooperation.reviewed_by = user_id
        
        db.commit()
        db.refresh(cooperation)
        
        # Notify applicant
        CooperationService._create_notification(
            db=db,
            agency_id=cooperation.from_agency_id,
            type="cooperation_change",
            title="合作申请已拒绝",
            content=f"您向机构 {agency_id} 的合作申请已被拒绝",
            related_entity_type="cooperation",
            related_entity_id=cooperation_id
        )
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="cooperation.reject",
            entity_type="cooperation",
            entity_id=cooperation_id,
            after_data={"status": "rejected"}
        )
        
        return cooperation
    
    @staticmethod
    def terminate_cooperation(
        db: Session,
        agency_id: str,
        user_id: str,
        cooperation_id: str
    ) -> Optional[CooperationRelation]:
        """终止合作关系（任一方可发起）"""
        cooperation = db.query(CooperationRelation).filter(
            CooperationRelation.id == cooperation_id,
            CooperationRelation.status == "approved"
        ).filter(
            (CooperationRelation.from_agency_id == agency_id) | 
            (CooperationRelation.to_agency_id == agency_id)
        ).first()
        
        if not cooperation:
            return None
        
        cooperation.status = "terminated"
        cooperation.terminated_at = datetime.utcnow()
        cooperation.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(cooperation)
        
        # Notify the other party
        other_agency_id = cooperation.to_agency_id if cooperation.from_agency_id == agency_id else cooperation.from_agency_id
        CooperationService._create_notification(
            db=db,
            agency_id=other_agency_id,
            type="cooperation_change",
            title="合作关系已终止",
            content=f"机构 {agency_id} 终止了与您的合作关系",
            related_entity_type="cooperation",
            related_entity_id=cooperation_id
        )
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="cooperation.terminate",
            entity_type="cooperation",
            entity_id=cooperation_id,
            after_data={"status": "terminated"}
        )
        
        return cooperation
    
    @staticmethod
    def list_cooperations(
        db: Session,
        agency_id: str,
        role: Optional[str] = None,  # provider|consumer
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[CooperationRelation]:
        """查询合作关系列表"""
        query = db.query(CooperationRelation)
        
        if role == "provider":
            # 我作为资源提供方（被申请方）
            query = query.filter(CooperationRelation.to_agency_id == agency_id)
        elif role == "consumer":
            # 我作为资源采购方（申请方）
            query = query.filter(CooperationRelation.from_agency_id == agency_id)
        else:
            # 所有相关的合作
            query = query.filter(
                (CooperationRelation.from_agency_id == agency_id) | 
                (CooperationRelation.to_agency_id == agency_id)
            )
        
        if status:
            query = query.filter(CooperationRelation.status == status)
        
        query = query.order_by(CooperationRelation.created_at.desc())
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def check_cooperation_status(
        db: Session,
        from_agency_id: str,
        to_agency_id: str
    ) -> Optional[str]:
        """检查两个机构间的合作状态"""
        cooperation = db.query(CooperationRelation).filter(
            CooperationRelation.from_agency_id == from_agency_id,
            CooperationRelation.to_agency_id == to_agency_id
        ).order_by(CooperationRelation.created_at.desc()).first()
        
        return cooperation.status if cooperation else None
    
    @staticmethod
    def publish_sku_to_public(
        db: Session,
        agency_id: str,
        user_id: str,
        sku_id: str
    ) -> Optional[SKU]:
        """将私有SKU发布到公共库"""
        sku = scoped_query(db, SKU, agency_id).filter(SKU.id == sku_id).first()
        if not sku:
            return None
        
        sku.is_public = True
        sku.public_status = "published"
        sku.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(sku)
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="sku.publish_to_public",
            entity_type="sku",
            entity_id=sku_id,
            after_data={"is_public": True, "public_status": "published"}
        )
        
        return sku
    
    @staticmethod
    def browse_public_skus(
        db: Session,
        agency_id: str,
        city: Optional[str] = None,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        keyword: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[SKU]:
        """浏览公共库SKU"""
        # Support both new flags (is_public/public_status) and legacy owner_type=public data
        query = db.query(SKU).filter(
            (SKU.is_public == True) | (SKU.owner_type == "public"),
            SKU.public_status != "removed"
        )
        
        if city:
            query = query.filter(SKU.destination_city == city)
        
        if category:
            query = query.filter(SKU.category == category)
        
        if tags:
            from sqlalchemy.dialects.postgresql import ARRAY
            from sqlalchemy import cast, String
            query = query.filter(SKU.tags_interest.op('&&')(cast(tags, ARRAY(String))))
        
        if keyword:
            query = query.filter(SKU.sku_name.ilike(f"%{keyword}%"))
        
        query = query.order_by(SKU.updated_at.desc())
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def copy_public_sku_to_private(
        db: Session,
        agency_id: str,
        user_id: str,
        public_sku_id: str
    ) -> Optional[SKU]:
        """将公共库SKU复制到私有库（需要已合作）"""
        # Get the public SKU
        public_sku = db.query(SKU).filter(
            SKU.id == public_sku_id,
            SKU.is_public == True,
            SKU.public_status == "published"
        ).first()
        
        if not public_sku:
            return None
        
        # 如果是自己发布的SKU，允许直接复制回私有库
        if public_sku.agency_id == agency_id:
            # 同一机构，允许复制
            pass
        else:
            # 不同机构，需要检查合作关系
            cooperation_status = CooperationService.check_cooperation_status(
                db, agency_id, public_sku.agency_id
            )
            
            if cooperation_status != "approved":
                raise ValueError("Cooperation not approved")
        
        # Create a copy in private library
        new_sku_id = f"TFRM-{public_sku.sku_type.upper()}-{uuid.uuid4().hex[:8].upper()}"
        
        new_sku = SKU(
            id=new_sku_id,
            agency_id=agency_id,
            product_id=None,
            sku_name=public_sku.sku_name,
            sku_type=public_sku.sku_type,
            category=public_sku.category,
            status=public_sku.status,
            owner_type="private",
            is_public=False,
            public_status="none",
            source_org_id=public_sku.agency_id,
            source_sku_id=public_sku.id,
            supplier_id=public_sku.supplier_id,
            supplier_name=public_sku.supplier_name,
            destination_country=public_sku.destination_country,
            destination_city=public_sku.destination_city,
            tags=public_sku.tags,
            tags_interest=public_sku.tags_interest,
            tags_service=public_sku.tags_service,
            valid_from=public_sku.valid_from,
            valid_to=public_sku.valid_to,
            booking_advance=public_sku.booking_advance,
            cancel_policy=public_sku.cancel_policy,
            include_items=public_sku.include_items,
            exclude_items=public_sku.exclude_items,
            description=public_sku.description,
            highlights=public_sku.highlights,
            inclusions=public_sku.inclusions,
            exclusions=public_sku.exclusions,
            cancellation_policy=public_sku.cancellation_policy,
            price_mode=public_sku.price_mode,
            calendar_prices=public_sku.calendar_prices,
            price_rules=public_sku.price_rules,
            attributes=public_sku.attributes,
            attrs=public_sku.attrs,
            base_cost_price=public_sku.base_sale_price,  # 合作方的成本价是供应商的销售价
            base_sale_price=public_sku.base_sale_price,
            media=public_sku.media,
            created_by=user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(new_sku)
        
        # Remove from public library (PRD requirement)
        public_sku.is_public = False
        public_sku.public_status = "removed"
        public_sku.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(new_sku)
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="sku.copy_from_public",
            entity_type="sku",
            entity_id=new_sku_id,
            after_data={
                "source_sku_id": public_sku_id,
                "source_org_id": public_sku.agency_id
            }
        )
        
        return new_sku
    
    @staticmethod
    def notify_sku_change(
        db: Session,
        sku_id: str,
        change_type: str,
        change_details: str
    ):
        """通知所有使用该SKU的合作方"""
        # Find all SKUs that reference this source SKU
        derived_skus = db.query(SKU).filter(SKU.source_sku_id == sku_id).all()
        
        for derived_sku in derived_skus:
            CooperationService._create_notification(
                db=db,
                agency_id=derived_sku.agency_id,
                type="sku_update",
                title=f"合作SKU有更新",
                content=f"您引用的SKU {sku_id} 发生了变更: {change_details}",
                related_entity_type="sku",
                related_entity_id=derived_sku.id
            )
        
        db.commit()
    
    @staticmethod
    def _create_notification(
        db: Session,
        agency_id: str,
        type: str,
        title: str,
        content: str,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[str] = None
    ):
        """创建站内通知"""
        notification_id = f"NOTIF-{uuid.uuid4().hex[:12].upper()}"
        
        notification = Notification(
            id=notification_id,
            agency_id=agency_id,
            type=type,
            title=title,
            content=content,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            is_read=False,
            created_at=datetime.utcnow()
        )
        
        db.add(notification)
