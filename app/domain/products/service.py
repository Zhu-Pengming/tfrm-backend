from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime

from app.infra.db import Product, scoped_query, SKU
from app.domain.products.schemas import ProductCreate, ProductUpdate
from app.domain.skus.schemas import SKUCreate
from app.domain.skus.service import SKUService
from app.infra.audit import audit_log


class ProductService:
    @staticmethod
    def create_product(
        db: Session,
        agency_id: str,
        user_id: str,
        product_data: ProductCreate
    ) -> Product:
        product_id = f"PROD-{uuid.uuid4().hex[:10].upper()}"
        product = Product(
            id=product_id,
            agency_id=agency_id,
            title=product_data.title,
            product_type=product_data.product_type,
            destination_country=product_data.destination_country,
            destination_city=product_data.destination_city,
            tags=product_data.tags,
            description=product_data.description,
            highlights=product_data.highlights,
            media=product_data.media or [],
            valid_from=product_data.valid_from,
            valid_to=product_data.valid_to,
            created_by=user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        db.add(product)
        db.commit()
        db.refresh(product)

        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="product.create",
            entity_type="product",
            entity_id=product.id,
            after_data={"title": product.title}
        )

        return product

    @staticmethod
    def get_product(db: Session, agency_id: str, product_id: str) -> Optional[Product]:
        return scoped_query(db, Product, agency_id).filter(Product.id == product_id).first()

    @staticmethod
    def list_products(
        db: Session,
        agency_id: str,
        product_type: Optional[str] = None,
        city: Optional[str] = None,
        keyword: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Product]:
        query = scoped_query(db, Product, agency_id)

        if product_type:
            query = query.filter(Product.product_type == product_type)
        if city:
            query = query.filter(Product.destination_city == city)
        if keyword:
            query = query.filter(Product.title.ilike(f"%{keyword}%"))

        return query.order_by(Product.updated_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def update_product(
        db: Session,
        agency_id: str,
        user_id: str,
        product_id: str,
        product_data: ProductUpdate
    ) -> Optional[Product]:
        product = scoped_query(db, Product, agency_id).filter(Product.id == product_id).first()
        if not product:
            return None

        update_dict = product_data.model_dump(exclude_none=True)
        for key, value in update_dict.items():
            setattr(product, key, value)
        product.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(product)

        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="product.update",
            entity_type="product",
            entity_id=product.id,
            after_data=update_dict
        )

        return product

    @staticmethod
    def delete_product(db: Session, agency_id: str, user_id: str, product_id: str) -> bool:
        product = scoped_query(db, Product, agency_id).filter(Product.id == product_id).first()
        if not product:
            return False

        # Ensure no SKUs remain attached
        sku_exists = scoped_query(db, SKU, agency_id).filter(SKU.product_id == product_id).first()
        if sku_exists:
            return False

        db.delete(product)
        db.commit()

        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="product.delete",
            entity_type="product",
            entity_id=product_id,
            before_data={"title": product.title}
        )

        return True

    @staticmethod
    def attach_sku(
        db: Session,
        agency_id: str,
        user_id: str,
        product_id: str,
        sku_data: SKUCreate
    ) -> Optional[SKU]:
        product = ProductService.get_product(db, agency_id, product_id)
        if not product:
            return None

        sku_data.product_id = product_id  # type: ignore[attr-defined]
        sku = SKUService.create_sku(db, agency_id, user_id, sku_data)
        return sku

    @staticmethod
    def with_skus(db: Session, agency_id: str, product: Product) -> Product:
        product.skus = scoped_query(db, SKU, agency_id).filter(SKU.product_id == product.id).all()  # type: ignore[attr-defined]
        return product
