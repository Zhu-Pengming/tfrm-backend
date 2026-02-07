from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from app.infra.db import SKU, scoped_query, SKUStatus, OwnerType, Product
from app.domain.skus.schemas import SKUCreate, SKUUpdate, validate_attrs
from app.infra.audit import audit_log
from typing import Optional, List, Dict, Any
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
        # Validate attrs if provided
        validated_attrs = {}
        if sku_data.attrs:
            validated_attrs = validate_attrs(sku_data.sku_type.value, sku_data.attrs)
        
        # Use attributes field (new) or attrs field (legacy)
        final_attributes = sku_data.attributes if sku_data.attributes else validated_attrs

        # Ensure product belongs to the same agency if provided
        if sku_data.product_id:
            product = scoped_query(db, Product, agency_id).filter(Product.id == sku_data.product_id).first()
            if not product:
                raise ValueError("Product not found or not owned by agency")
        
        sku_id = f"TFRM-{sku_data.sku_type.value.upper()}-{uuid.uuid4().hex[:8].upper()}"
        
        # Determine category from sku_type if not provided
        from app.domain.skus.schemas import SKU_TYPE_TO_CATEGORY
        category = sku_data.category if sku_data.category else SKU_TYPE_TO_CATEGORY.get(sku_data.sku_type.value, sku_data.sku_type.value)
        
        sku = SKU(
            id=sku_id,
            agency_id=agency_id,
            product_id=sku_data.product_id,
            sku_name=sku_data.sku_name,
            sku_type=sku_data.sku_type.value,
            category=category,
            status=SKUStatus.ACTIVE,
            owner_type=sku_data.owner_type,
            
            # Dual-library fields
            is_public=sku_data.is_public or False,
            public_status="none",
            
            supplier_id=sku_data.supplier_id,
            supplier_name=sku_data.supplier_name,
            destination_country=sku_data.destination_country,
            destination_city=sku_data.destination_city,
            
            # Unified tag system
            tags=sku_data.tags,
            tags_interest=sku_data.tags_interest,
            tags_service=sku_data.tags_service or {},
            
            valid_from=sku_data.valid_from,
            valid_to=sku_data.valid_to,
            booking_advance=sku_data.booking_advance,
            cancel_policy=sku_data.cancel_policy,
            include_items=sku_data.include_items,
            exclude_items=sku_data.exclude_items,
            description=sku_data.description,
            highlights=sku_data.highlights,
            inclusions=sku_data.inclusions,
            exclusions=sku_data.exclusions,
            cancellation_policy=sku_data.cancellation_policy,
            price_mode=sku_data.price_mode.value if sku_data.price_mode else None,
            calendar_prices=sku_data.calendar_prices,
            price_rules=sku_data.price_rules,
            
            # Dual attributes fields
            attributes=final_attributes,
            attrs=validated_attrs if validated_attrs else final_attributes,
            
            # Price fields
            base_cost_price=sku_data.base_cost_price,
            base_sale_price=sku_data.base_sale_price,
            
            # AI Import raw data
            raw_extracted=sku_data.raw_extracted,
            
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
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"=== SKU Update Debug ===")
        logger.info(f"SKU ID: {sku_id}")
        logger.info(f"SKU Type: {sku.sku_type}")
        logger.info(f"Received update_dict: {update_dict}")
        
        if "attrs" in update_dict:
            logger.info(f"Original attrs: {update_dict['attrs']}")
            validated_attrs = validate_attrs(sku.sku_type, update_dict["attrs"])
            logger.info(f"Validated attrs: {validated_attrs}")
            update_dict["attrs"] = validated_attrs
        if "price_mode" in update_dict and update_dict["price_mode"]:
            # Enum to raw value
            val = update_dict["price_mode"]
            update_dict["price_mode"] = val.value if hasattr(val, "value") else val
        if "product_id" in update_dict and update_dict["product_id"]:
            product = scoped_query(db, Product, agency_id).filter(Product.id == update_dict["product_id"]).first()
            if not product:
                raise ValueError("Product not found or not owned by agency")
        
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
    
    @staticmethod
    def update_price_calendar(
        db: Session,
        agency_id: str,
        user_id: str,
        sku_id: str,
        calendar_items: List[Dict[str, Any]]
    ) -> Optional[SKU]:
        """Update price calendar for a SKU"""
        sku = scoped_query(db, SKU, agency_id).filter(SKU.id == sku_id).first()
        if not sku:
            return None
        
        # Convert calendar items to dict format
        calendar_dict = {}
        for item in calendar_items:
            date_str = item['date'].isoformat() if hasattr(item['date'], 'isoformat') else str(item['date'])
            calendar_dict[date_str] = {
                'cost_price': float(item['cost_price']),
                'sales_price': float(item['sales_price']),
                'inventory': item.get('inventory'),
                'is_available': item.get('is_available', True)
            }
        
        # Update attrs with price calendar
        if sku.attrs is None:
            sku.attrs = {}
        sku.attrs['price_calendar'] = calendar_dict
        sku.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(sku)
        
        return sku
    
    @staticmethod
    def batch_update_pricing(
        db: Session,
        agency_id: str,
        user_id: str,
        sku_ids: List[str],
        margin_percentage: Optional[float] = None,
        multiply_factor: Optional[float] = None,
        add_amount: Optional[float] = None
    ) -> int:
        """Batch update SKU pricing"""
        query = scoped_query(db, SKU, agency_id).filter(SKU.id.in_(sku_ids))
        skus = query.all()
        
        updated_count = 0
        for sku in skus:
            # Get cost price from attrs
            cost_price = None
            if sku.attrs:
                for key in ['daily_cost_price', 'cost_price', 'per_person_price']:
                    if key in sku.attrs:
                        cost_price = float(sku.attrs[key])
                        break
            
            if cost_price:
                new_price = cost_price
                
                if margin_percentage is not None:
                    # Calculate based on margin: sales_price = cost_price / (1 - margin%)
                    new_price = cost_price / (1 - margin_percentage / 100)
                elif multiply_factor is not None:
                    new_price = cost_price * multiply_factor
                elif add_amount is not None:
                    new_price = cost_price + add_amount
                
                # Update sales price in attrs
                updated = False
                for key in ['daily_sell_price', 'sell_price', 'per_person_price']:
                    if key in sku.attrs:
                        sku.attrs[key] = round(new_price, 2)
                        updated = True
                        break
                
                # If no matching key found, try to add to the first available cost key's sell equivalent
                if not updated:
                    for cost_key, sell_key in [('daily_cost_price', 'daily_sell_price'), 
                                                ('cost_price', 'sell_price'),
                                                ('per_person_price', 'per_person_price')]:
                        if cost_key in sku.attrs:
                            sku.attrs[sell_key] = round(new_price, 2)
                            updated = True
                            break
                
                if updated:
                    # Mark the attrs field as modified so SQLAlchemy detects the change
                    flag_modified(sku, 'attrs')
                    sku.updated_at = datetime.utcnow()
                    updated_count += 1
        
        db.commit()
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="sku.batch_pricing",
            entity_type="sku",
            entity_id="batch",
            after_data={"count": updated_count, "sku_ids": sku_ids}
        )
        
        return updated_count
    
    @staticmethod
    def batch_update_skus(
        db: Session,
        agency_id: str,
        user_id: str,
        sku_ids: List[str],
        update_data: Dict[str, Any]
    ) -> int:
        """Batch update SKU fields"""
        query = scoped_query(db, SKU, agency_id).filter(SKU.id.in_(sku_ids))
        
        updated_count = query.update(update_data, synchronize_session=False)
        db.commit()
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="sku.batch_update",
            entity_type="sku",
            entity_id="batch",
            after_data={"count": updated_count, "sku_ids": sku_ids, "updates": update_data}
        )
        
        return updated_count
    
    @staticmethod
    def batch_delete_skus(
        db: Session,
        agency_id: str,
        user_id: str,
        sku_ids: List[str]
    ) -> int:
        """Batch delete SKUs"""
        query = scoped_query(db, SKU, agency_id).filter(SKU.id.in_(sku_ids))
        deleted_count = query.delete(synchronize_session=False)
        db.commit()
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="sku.batch_delete",
            entity_type="sku",
            entity_id="batch",
            after_data={"count": deleted_count, "sku_ids": sku_ids}
        )
        
        return deleted_count
    
    @staticmethod
    def publish_sku(
        db: Session,
        agency_id: str,
        user_id: str,
        sku_id: str,
        visibility_scope: str = "all",
        partner_whitelist: Optional[List[str]] = None
    ) -> Optional[SKU]:
        """Publish a private SKU to the public resource repository"""
        sku = scoped_query(db, SKU, agency_id).filter(SKU.id == sku_id).first()
        if not sku:
            return None
        
        before_data = {
            "owner_type": sku.owner_type,
            "visibility_scope": sku.visibility_scope
        }
        
        sku.owner_type = "public"
        # Mark as published to public library so browse_public_skus can find it
        sku.is_public = True
        sku.public_status = "published"
        sku.visibility_scope = visibility_scope
        if partner_whitelist:
            sku.partner_whitelist = partner_whitelist
        sku.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(sku)
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="sku.publish",
            entity_type="sku",
            entity_id=sku.id,
            before_data=before_data,
            after_data={
                "owner_type": sku.owner_type,
                "is_public": sku.is_public,
                "public_status": sku.public_status,
                "visibility_scope": sku.visibility_scope,
                "partner_whitelist": partner_whitelist
            }
        )
        
        return sku
