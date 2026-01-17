from sqlalchemy.orm import Session
from app.infra.db import Quotation, QuotationItem, SKU, scoped_query
from app.domain.quotations.schemas import QuotationCreate, QuotationUpdate
from app.domain.quotations.converters import SKUToQuoteItemConverter
from app.infra.audit import audit_log
from typing import Optional, List
import uuid
from datetime import datetime
from decimal import Decimal


class QuotationService:
    @staticmethod
    def create_quotation(
        db: Session,
        agency_id: str,
        user_id: str,
        quotation_data: QuotationCreate
    ) -> Quotation:
        quotation_id = f"QUOTE-{uuid.uuid4().hex[:12].upper()}"
        
        quotation = Quotation(
            id=quotation_id,
            agency_id=agency_id,
            user_id=user_id,
            title=quotation_data.title,
            customer_name=quotation_data.customer_name,
            customer_contact=quotation_data.customer_contact,
            notes=quotation_data.notes,
            status="draft",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(quotation)
        db.flush()
        
        total_amount = Decimal(0)
        
        for idx, item_data in enumerate(quotation_data.items):
            sku = scoped_query(db, SKU, agency_id).filter(SKU.id == item_data.sku_id).first()
            if not sku:
                continue
            
            snapshot = SKUToQuoteItemConverter.convert(sku)
            
            unit_price = Decimal(str(snapshot.get("unit_price", 0)))
            quantity = item_data.quantity
            subtotal = unit_price * quantity
            
            item = QuotationItem(
                id=f"QITEM-{uuid.uuid4().hex[:12].upper()}",
                quotation_id=quotation.id,
                sku_id=sku.id,
                snapshot=snapshot,
                quantity=quantity,
                unit_price=unit_price,
                subtotal=subtotal,
                custom_title=item_data.custom_title,
                custom_description=item_data.custom_description,
                custom_notes=item_data.custom_notes,
                sort_order=idx,
                created_at=datetime.utcnow()
            )
            
            db.add(item)
            total_amount += subtotal
        
        quotation.total_amount = total_amount
        quotation.discount_amount = Decimal(0)
        quotation.final_amount = total_amount
        
        db.commit()
        db.refresh(quotation)
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="quotation.create",
            entity_type="quotation",
            entity_id=quotation.id,
            after_data={"title": quotation.title, "total_amount": float(total_amount)}
        )
        
        return quotation
    
    @staticmethod
    def get_quotation(db: Session, agency_id: str, quotation_id: str) -> Optional[Quotation]:
        return scoped_query(db, Quotation, agency_id).filter(Quotation.id == quotation_id).first()
    
    @staticmethod
    def get_quotation_items(db: Session, quotation_id: str) -> List[QuotationItem]:
        return db.query(QuotationItem).filter(
            QuotationItem.quotation_id == quotation_id
        ).order_by(QuotationItem.sort_order).all()
    
    @staticmethod
    def update_quotation(
        db: Session,
        agency_id: str,
        user_id: str,
        quotation_id: str,
        quotation_data: QuotationUpdate
    ) -> Optional[Quotation]:
        quotation = scoped_query(db, Quotation, agency_id).filter(Quotation.id == quotation_id).first()
        if not quotation:
            return None
        
        update_dict = quotation_data.model_dump(exclude_none=True)
        
        for key, value in update_dict.items():
            setattr(quotation, key, value)
        
        if "discount_amount" in update_dict:
            quotation.final_amount = quotation.total_amount - quotation.discount_amount
        
        quotation.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(quotation)
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="quotation.update",
            entity_type="quotation",
            entity_id=quotation.id,
            after_data=update_dict
        )
        
        return quotation
    
    @staticmethod
    def publish_quotation(
        db: Session,
        agency_id: str,
        user_id: str,
        quotation_id: str
    ) -> Optional[str]:
        quotation = scoped_query(db, Quotation, agency_id).filter(Quotation.id == quotation_id).first()
        if not quotation:
            return None
        
        quotation.status = "published"
        quotation.published_at = datetime.utcnow()
        quotation.published_url = f"/share/quotation/{quotation.id}"
        
        db.commit()
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="quotation.publish",
            entity_type="quotation",
            entity_id=quotation.id,
            after_data={"published_url": quotation.published_url}
        )
        
        return quotation.published_url
    
    @staticmethod
    def list_quotations(
        db: Session,
        agency_id: str,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Quotation]:
        query = scoped_query(db, Quotation, agency_id)
        
        if status:
            query = query.filter(Quotation.status == status)
        
        query = query.order_by(Quotation.created_at.desc())
        
        return query.offset(skip).limit(limit).all()
