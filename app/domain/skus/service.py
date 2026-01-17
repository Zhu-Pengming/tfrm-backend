from sqlalchemy.orm import Session
from app.infra.db import SKU, scoped_query, SKUStatus, OwnerType
from app.domain.skus.schemas import SKUCreate, SKUUpdate, validate_attrs
from app.infra.audit import audit_log
from typing import Optional, List
import uuid
from datetime import datetime


class SKUService:
    @staticmethod
    def create_sku(
        db: Session,
        agency_id: str,
        user_id: str,
        sku_data: SKUCreate
    ) -> SKU:
        validated_attrs = validate_attrs(sku_data.sku_type.value, sku_data.attrs)
        
        sku_id = f"TFRM-{sku_data.sku_type.value.upper()}-{uuid.uuid4().hex[:8].upper()}"
        
        sku = SKU(
            id=sku_id,
            agency_id=agency_id,
            sku_name=sku_data.sku_name,
            sku_type=sku_data.sku_type.value,
            status=SKUStatus.ACTIVE,
            owner_type=sku_data.owner_type,
            supplier_id=sku_data.supplier_id,
            supplier_name=sku_data.supplier_name,
            destination_country=sku_data.destination_country,
            destination_city=sku_data.destination_city,
            tags=sku_data.tags,
            valid_from=sku_data.valid_from,
            valid_to=sku_data.valid_to,
            booking_advance=sku_data.booking_advance,
            cancel_policy=sku_data.cancel_policy,
            include_items=sku_data.include_items,
            exclude_items=sku_data.exclude_items,
            attrs=validated_attrs,
            media=sku_data.media or [],
            created_by=user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(sku)
        db.commit()
        db.refresh(sku)
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="sku.create",
            entity_type="sku",
            entity_id=sku.id,
            after_data={"sku_name": sku.sku_name, "sku_type": sku.sku_type}
        )
        
        return sku
    
    @staticmethod
    def get_sku(db: Session, agency_id: str, sku_id: str) -> Optional[SKU]:
        return scoped_query(db, SKU, agency_id).filter(SKU.id == sku_id).first()
    
    @staticmethod
    def update_sku(
        db: Session,
        agency_id: str,
        user_id: str,
        sku_id: str,
        sku_data: SKUUpdate
    ) -> Optional[SKU]:
        sku = scoped_query(db, SKU, agency_id).filter(SKU.id == sku_id).first()
        if not sku:
            return None
        
        before_data = {
            "sku_name": sku.sku_name,
            "attrs": sku.attrs
        }
        
        update_dict = sku_data.model_dump(exclude_none=True)
        
        if "attrs" in update_dict:
            validated_attrs = validate_attrs(sku.sku_type, update_dict["attrs"])
            update_dict["attrs"] = validated_attrs
        
        for key, value in update_dict.items():
            setattr(sku, key, value)
        
        sku.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(sku)
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="sku.update",
            entity_type="sku",
            entity_id=sku.id,
            before_data=before_data,
            after_data={"sku_name": sku.sku_name, "attrs": sku.attrs}
        )
        
        return sku
    
    @staticmethod
    def list_skus(
        db: Session,
        agency_id: str,
        sku_type: Optional[str] = None,
        city: Optional[str] = None,
        tags: Optional[List[str]] = None,
        status: Optional[str] = None,
        owner_type: Optional[str] = None,
        keyword: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[SKU]:
        query = scoped_query(db, SKU, agency_id)
        
        if sku_type:
            query = query.filter(SKU.sku_type == sku_type)
        
        if city:
            query = query.filter(SKU.destination_city == city)
        
        if tags:
            from sqlalchemy.dialects.postgresql import ARRAY
            from sqlalchemy import cast, String
            # Use PostgreSQL's && (overlap) operator
            query = query.filter(SKU.tags.op('&&')(cast(tags, ARRAY(String))))
        
        if status:
            query = query.filter(SKU.status == status)
        
        if owner_type:
            query = query.filter(SKU.owner_type == owner_type)
        
        if keyword:
            query = query.filter(SKU.sku_name.ilike(f"%{keyword}%"))
        
        query = query.order_by(SKU.updated_at.desc())
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def delete_sku(db: Session, agency_id: str, user_id: str, sku_id: str) -> bool:
        sku = scoped_query(db, SKU, agency_id).filter(SKU.id == sku_id).first()
        if not sku:
            return False
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="sku.delete",
            entity_type="sku",
            entity_id=sku.id,
            before_data={"sku_name": sku.sku_name}
        )
        
        db.delete(sku)
        db.commit()
        return True
