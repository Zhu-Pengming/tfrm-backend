from sqlalchemy.orm import Session
from app.infra.db import PricingFactor, SKU, scoped_query
from app.domain.skus.service import SKUService
from app.domain.skus.schemas import SKUCreate
from app.domain.skus.pricing_schemas import AvailabilityItem, AvailabilityResponse
from app.infra.audit import audit_log
from typing import Optional, List, Tuple
from decimal import Decimal
from datetime import date, timedelta
import uuid


class PricingService:
    @staticmethod
    def apply_factor_to_price(
        cost_price: Decimal,
        multiply_factor: Decimal,
        add_amount: Decimal
    ) -> Decimal:
        return cost_price * multiply_factor + add_amount
    
    @staticmethod
    def find_matching_factor(
        db: Session,
        agency_id: str,
        sku: SKU
    ) -> Optional[PricingFactor]:
        factors = scoped_query(db, PricingFactor, agency_id).order_by(
            PricingFactor.priority.desc()
        ).all()
        
        for factor in factors:
            if factor.valid_from and factor.valid_from > date.today():
                continue
            if factor.valid_to and factor.valid_to < date.today():
                continue
            
            if factor.apply_to_sku_types and sku.sku_type not in factor.apply_to_sku_types:
                continue
            
            if factor.apply_to_cities and sku.destination_city not in factor.apply_to_cities:
                continue
            
            if factor.apply_to_tags and not any(tag in (sku.tags or []) for tag in factor.apply_to_tags):
                continue
            
            if factor.apply_to_suppliers and sku.supplier_id not in factor.apply_to_suppliers:
                continue
            
            return factor
        
        return None

    @staticmethod
    def _base_prices(sku: SKU) -> Tuple[Optional[Decimal], Optional[Decimal]]:
        attrs = sku.attrs or {}
        cost_fields = ['daily_cost_price', 'cost_price', 'per_person_price', 'adult_price']
        sell_fields = ['daily_sell_price', 'sell_price', 'per_person_price', 'adult_price']

        def first_decimal(keys):
            for key in keys:
                if key in attrs and attrs[key] is not None:
                    try:
                        return Decimal(str(attrs[key]))
                    except Exception:
                        continue
            return None

        cost = first_decimal(cost_fields)
        sell = first_decimal(sell_fields)
        return cost, sell

    @staticmethod
    def resolve_price_for_date(
        sku: SKU,
        target_date: date,
        factor: Optional[PricingFactor] = None
    ) -> dict:
        cost, sell = PricingService._base_prices(sku)
        base_price = sell or cost or Decimal("0")
        price_source = "fixed"
        rule_applied = None

        # Calendar pricing has highest priority
        calendar = sku.calendar_prices or (sku.attrs or {}).get("price_calendar") or {}
        calendar_price = None
        if target_date and isinstance(calendar, dict):
            key = target_date.isoformat()
            entry = calendar.get(key)
            if entry is None and target_date.strftime("%Y-%m-%d") != key:
                entry = calendar.get(target_date.strftime("%Y-%m-%d"))
            if entry is not None:
                if isinstance(entry, dict):
                    calendar_price = entry.get("sales_price") or entry.get("price") or entry.get("amount")
                else:
                    calendar_price = entry

        if calendar_price is not None:
            base_price = Decimal(str(calendar_price))
            price_source = "calendar"
        elif sku.price_mode == "ruled" and sku.price_rules:
            for rule in sku.price_rules:
                rule_name = rule.get("rule")
                delta_amount = Decimal(str(rule.get("delta_amount", 0)))
                if rule_name == "weekend" and target_date.weekday() >= 5:
                    base_price = (sell or cost or Decimal("0")) + delta_amount
                    rule_applied = rule
                    price_source = "rule"
                    break

        factor_applied = None
        if factor:
            base_price = PricingService.apply_factor_to_price(base_price, factor.multiply_factor, factor.add_amount)
            factor_applied = factor.id

        return {
            "base_price": float(sell or cost or Decimal("0")),
            "final_price": float(base_price),
            "price_source": price_source,
            "rule_applied": rule_applied,
            "factor_applied": factor_applied
        }

    @staticmethod
    def build_availability(
        db: Session,
        agency_id: str,
        sku: SKU,
        days: int = 30
    ) -> AvailabilityResponse:
        factor = PricingService.find_matching_factor(db, agency_id, sku)
        items: List[AvailabilityItem] = []
        currency = (sku.attrs or {}).get("currency") or "CNY"
        for i in range(days):
            d = date.today() + timedelta(days=i)
            result = PricingService.resolve_price_for_date(sku, d, factor)
            items.append(AvailabilityItem(date=d, **result))
        return AvailabilityResponse(sku_id=sku.id, currency=currency, items=items)
    
    @staticmethod
    def pull_public_sku(
        db: Session,
        agency_id: str,
        user_id: str,
        public_sku_id: str,
        apply_factor: bool = True
    ) -> Optional[SKU]:
        public_sku = db.query(SKU).filter(
            SKU.id == public_sku_id,
            SKU.owner_type == "public"
        ).first()
        
        if not public_sku:
            return None
        
        if public_sku.visibility_scope == "partner_whitelist":
            if not public_sku.partner_whitelist or agency_id not in public_sku.partner_whitelist:
                return None
        
        new_attrs = public_sku.attrs.copy()
        factor = None
        
        if apply_factor:
            factor = PricingService.find_matching_factor(db, agency_id, public_sku)
            
            if factor:
                price_fields = []
                if public_sku.sku_type == "hotel":
                    price_fields = ["daily_cost_price", "daily_sell_price"]
                elif public_sku.sku_type in ["car", "guide", "ticket", "activity"]:
                    price_fields = ["cost_price", "sell_price"]
                elif public_sku.sku_type == "itinerary":
                    price_fields = ["adult_price", "child_price"]
                elif public_sku.sku_type == "restaurant":
                    price_fields = ["per_person_price"]
                
                for field in price_fields:
                    if field in new_attrs and new_attrs[field]:
                        original_price = Decimal(str(new_attrs[field]))
                        new_price = PricingService.apply_factor_to_price(
                            original_price,
                            factor.multiply_factor,
                            factor.add_amount
                        )
                        new_attrs[field] = float(new_price)
        
        sku_create = SKUCreate(
            sku_name=public_sku.sku_name,
            sku_type=public_sku.sku_type,
            owner_type="private",
            supplier_id=public_sku.supplier_id,
            supplier_name=public_sku.supplier_name,
            destination_country=public_sku.destination_country,
            destination_city=public_sku.destination_city,
            tags=public_sku.tags,
            valid_from=public_sku.valid_from,
            valid_to=public_sku.valid_to,
            booking_advance=public_sku.booking_advance,
            cancel_policy=public_sku.cancel_policy,
            include_items=public_sku.include_items,
            exclude_items=public_sku.exclude_items,
            attrs=new_attrs,
            media=public_sku.media
        )
        
        new_sku = SKUService.create_sku(db, agency_id, user_id, sku_create)
        
        new_sku.source_sku_id = public_sku.id
        if apply_factor and factor:
            new_sku.applied_factor_id = factor.id
        
        db.commit()
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="sku.pull_from_public",
            entity_type="sku",
            entity_id=new_sku.id,
            after_data={
                "source_sku_id": public_sku.id,
                "applied_factor": apply_factor,
                "factor_id": factor.id if factor else None
            }
        )
        
        return new_sku
