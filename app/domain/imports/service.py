from sqlalchemy.orm import Session
from app.infra.db import ImportTask, ImportStatus, scoped_query
from app.domain.imports.schemas import ImportTaskCreate, ImportConfirm
from app.domain.imports.tasks import parse_import_task
from app.domain.skus.schemas import SKUCreate
from app.domain.skus.service import SKUService
from app.infra.audit import audit_log
from typing import Optional, List
import uuid
from datetime import datetime


class ImportService:
    @staticmethod
    def create_import_task(
        db: Session,
        agency_id: str,
        user_id: str,
        task_data: ImportTaskCreate
    ) -> ImportTask:
        task_id = f"IMPORT-{uuid.uuid4().hex[:12].upper()}"
        
        task = ImportTask(
            id=task_id,
            agency_id=agency_id,
            user_id=user_id,
            status=ImportStatus.CREATED,
            input_text=task_data.input_text,
            input_files=task_data.input_files or [],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(task)
        db.commit()
        db.refresh(task)
        
        task.status = ImportStatus.UPLOADED
        db.commit()
        
        parse_import_task.delay(task_id)
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="import.create",
            entity_type="import_task",
            entity_id=task.id,
            after_data={"status": "uploaded"}
        )
        
        return task
    
    @staticmethod
    def get_import_task(db: Session, agency_id: str, task_id: str) -> Optional[ImportTask]:
        return scoped_query(db, ImportTask, agency_id).filter(ImportTask.id == task_id).first()
    
    @staticmethod
    def list_import_tasks(
        db: Session,
        agency_id: str,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[ImportTask]:
        query = scoped_query(db, ImportTask, agency_id)
        
        if status:
            query = query.filter(ImportTask.status == status)
        
        query = query.order_by(ImportTask.created_at.desc())
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def confirm_import(
        db: Session,
        agency_id: str,
        user_id: str,
        task_id: str,
        confirm_data: ImportConfirm
    ) -> Optional[str]:
        task = scoped_query(db, ImportTask, agency_id).filter(ImportTask.id == task_id).first()
        if not task or task.status != ImportStatus.PARSED:
            return None
        
        # 准备attrs，为必需字段添加默认值
        attrs = confirm_data.extracted_fields.copy()
        
        # 为酒店类型添加必需字段的默认值
        if confirm_data.sku_type == "hotel":
            if "address" not in attrs:
                # 尝试从目的地城市构建地址
                city = attrs.get("destination_city", "")
                attrs["address"] = f"{city}" if city else "未指定地址"
        
        sku_create = SKUCreate(
            sku_name=confirm_data.extracted_fields.get("sku_name", "Unnamed SKU"),
            sku_type=confirm_data.sku_type,
            owner_type="private",
            supplier_id=confirm_data.extracted_fields.get("supplier_id"),
            supplier_name=confirm_data.extracted_fields.get("supplier_name"),
            destination_country=confirm_data.extracted_fields.get("destination_country"),
            destination_city=confirm_data.extracted_fields.get("destination_city"),
            tags=confirm_data.extracted_fields.get("tags", []),
            valid_from=confirm_data.extracted_fields.get("valid_from"),
            valid_to=confirm_data.extracted_fields.get("valid_to"),
            booking_advance=confirm_data.extracted_fields.get("booking_advance"),
            cancel_policy=confirm_data.extracted_fields.get("cancel_policy"),
            include_items=confirm_data.extracted_fields.get("include_items"),
            exclude_items=confirm_data.extracted_fields.get("exclude_items"),
            attrs=attrs
        )
        
        sku = SKUService.create_sku(db, agency_id, user_id, sku_create)
        
        task.status = ImportStatus.CONFIRMED
        task.created_sku_id = sku.id
        task.updated_at = datetime.utcnow()
        db.commit()
        
        audit_log(
            db=db,
            agency_id=agency_id,
            user_id=user_id,
            action="import.confirm",
            entity_type="import_task",
            entity_id=task.id,
            after_data={"created_sku_id": sku.id}
        )
        
        return sku.id
