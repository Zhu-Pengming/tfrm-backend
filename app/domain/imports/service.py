from sqlalchemy.orm import Session
from app.infra.db import ImportTask, ImportStatus, scoped_query
from app.domain.imports.schemas import ImportTaskCreate, ImportConfirm
from app.domain.imports.tasks import parse_import_task
from app.domain.skus.schemas import SKUCreate
from app.domain.skus.service import SKUService
from app.infra.audit import audit_log
from typing import Optional, List
import zipfile
import io
from xml.etree import ElementTree as ET
import logging
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
        
        # 自动纠正SKU类型：如果有room_types数据，强制为hotel
        sku_type = confirm_data.sku_type
        if attrs.get("room_types") and isinstance(attrs.get("room_types"), list) and len(attrs.get("room_types", [])) > 0:
            if sku_type != "hotel":
                print(f"⚠️ 自动纠正SKU类型: {sku_type} → hotel (检测到room_types数据)")
                sku_type = "hotel"
        
        # 定义各类型的特定字段
        type_specific_fields = {
            'hotel': ['hotel_name', 'room_type_name', 'address', 'daily_cost_price', 'daily_sell_price'],
            'itinerary': ['itinerary_name', 'days', 'nights', 'departure_dates', 'highlights', 'included_services', 'booking_notes'],
            'ticket': ['attraction_name', 'ticket_type'],
            'guide': ['guide_name', 'language'],
            'transport': ['vehicle_type', 'capacity'],
            'restaurant': ['restaurant_name', 'cuisine_type', 'meal_types', 'per_person_price'],
            'activity': ['activity_name', 'category', 'duration_hours', 'meeting_point', 'included_items']
        }
        
        # 清理其他类型的特定字段
        current_type_fields = type_specific_fields.get(sku_type, [])
        for type_name, fields in type_specific_fields.items():
            if type_name != sku_type:
                for field in fields:
                    if field in attrs and field not in current_type_fields:
                        del attrs[field]
        
        # 为酒店类型添加必需字段的默认值
        if sku_type == "hotel":
            if "hotel_name" not in attrs:
                attrs["hotel_name"] = confirm_data.extracted_fields.get("sku_name", "未指定酒店")
            if "address" not in attrs:
                # 尝试从目的地城市构建地址
                city = confirm_data.extracted_fields.get("destination_city", "")
                attrs["address"] = f"{city}" if city else "未指定地址"
            
            # 如果有room_types（复杂酒店模式），不需要room_type_name
            if "room_types" not in attrs and "room_type_name" not in attrs:
                attrs["room_type_name"] = "标准间"
        
        # 为行程类型添加必需字段的默认值
        elif sku_type == "itinerary":
            if "itinerary_name" not in attrs:
                attrs["itinerary_name"] = confirm_data.extracted_fields.get("sku_name", "未命名行程")
            if "days" not in attrs:
                attrs["days"] = 1
            if "depart_city" not in attrs:
                # 尝试从目的地城市或国家构建出发城市
                attrs["depart_city"] = confirm_data.extracted_fields.get("destination_city") or confirm_data.extracted_fields.get("destination_country") or "待确定"
            # 处理departure_dates字段 - 提取价格信息
            if "departure_dates" in attrs:
                dates = attrs["departure_dates"]
                prices = []
                
                if isinstance(dates, str):
                    # 如果是字符串且包含价格符号，尝试提取价格
                    if "¥" in dates or ":" in dates:
                        # 尝试提取所有价格数字
                        import re
                        price_matches = re.findall(r'¥?(\d+)', dates)
                        prices = [int(p) for p in price_matches if int(p) > 100]  # 过滤掉日期数字
                        del attrs["departure_dates"]
                    else:
                        attrs["departure_dates"] = [dates]
                elif isinstance(dates, list) and dates:
                    # 检查列表中的第一个元素
                    if isinstance(dates[0], str) and ("¥" in dates[0] or ":" in dates[0]):
                        # 包含价格信息，提取价格
                        import re
                        for date_str in dates:
                            price_matches = re.findall(r'¥?(\d+)', str(date_str))
                            prices.extend([int(p) for p in price_matches if int(p) > 100])
                        del attrs["departure_dates"]
                
                # 如果提取到价格，使用最低价作为adult_price
                if prices and "adult_price" not in attrs:
                    attrs["adult_price"] = min(prices)
            
            # 确保其他数组字段是列表类型
            if "highlights" in attrs and isinstance(attrs["highlights"], str):
                attrs["highlights"] = [attrs["highlights"]]
            if "included_services" in attrs and isinstance(attrs["included_services"], str):
                attrs["included_services"] = [attrs["included_services"]]
        
        tags = confirm_data.extracted_fields.get("tags", [])
        if isinstance(tags, str):
            tags = [tag.strip() for tag in tags.split(",")]
        
        # 处理highlights字段
        highlights = confirm_data.extracted_fields.get("highlights")
        if highlights and isinstance(highlights, str):
            highlights = [highlights]
        
        # 处理included_services字段（映射到inclusions）
        inclusions = confirm_data.extracted_fields.get("included_services") or confirm_data.extracted_fields.get("inclusions")
        if inclusions and isinstance(inclusions, str):
            inclusions = [inclusions]
        
        # 获取SKU名称，优先使用itinerary_name或其他类型特定名称
        sku_name = (
            confirm_data.extracted_fields.get("sku_name") or
            attrs.get("itinerary_name") or
            attrs.get("hotel_name") or
            attrs.get("activity_name") or
            attrs.get("restaurant_name") or
            "未命名资源"
        )
        
        sku_create = SKUCreate(
            sku_name=sku_name,
            sku_type=sku_type,
            owner_type="private",
            supplier_id=confirm_data.extracted_fields.get("supplier_id"),
            supplier_name=confirm_data.extracted_fields.get("supplier_name"),
            destination_country=confirm_data.extracted_fields.get("destination_country"),
            destination_city=confirm_data.extracted_fields.get("destination_city"),
            tags=tags,
            valid_from=confirm_data.extracted_fields.get("valid_from"),
            valid_to=confirm_data.extracted_fields.get("valid_to"),
            booking_advance=confirm_data.extracted_fields.get("booking_advance"),
            cancel_policy=confirm_data.extracted_fields.get("cancel_policy"),
            include_items=confirm_data.extracted_fields.get("include_items"),
            exclude_items=confirm_data.extracted_fields.get("exclude_items"),
            description=confirm_data.extracted_fields.get("description"),
            highlights=highlights,
            inclusions=inclusions,
            attrs=attrs,
            raw_extracted=task.extracted_fields
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
    
    @staticmethod
    async def extract_with_ai(
        db: Session,
        agency_id: str,
        user_id: str,
        input_text: Optional[str] = None,
        file_data: Optional[bytes] = None,
        file_mime_type: Optional[str] = None
    ) -> ImportTask:
        """
        Use AI to extract SKU information directly
        Uses Kimi K2.5 with native multimodal support (vision + text)
        """
        from app.infra.llm_client import LLMClient
        
        task_id = f"IMPORT-{uuid.uuid4().hex[:12].upper()}"
        
        task = ImportTask(
            id=task_id,
            agency_id=agency_id,
            user_id=user_id,
            status=ImportStatus.PARSING,
            input_text=input_text,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(task)
        db.commit()
        
        try:
            logger = logging.getLogger(__name__)
            from app.config import get_settings
            settings = get_settings()
            
            print(f"\n{'='*80}")
            print(f"LLM PROVIDER: {settings.llm_provider}")
            print(f"{'='*80}\n")
            
            # For Kimi provider: use file upload API for PDF/DOCX/images
            if settings.llm_provider == "kimi" and file_data and file_mime_type:
                from app.infra.kimi_client import KimiClient
                
                # Determine filename from mime type
                if file_mime_type == 'application/pdf':
                    filename = "document.pdf"
                elif file_mime_type in ('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'):
                    filename = "document.docx"
                elif file_mime_type.startswith('image/'):
                    ext = file_mime_type.split('/')[-1]
                    filename = f"image.{ext}"
                else:
                    filename = "file"
                
                kimi_client = KimiClient()
                
                # Upload file to Kimi
                file_id = await kimi_client.upload_file(file_data, filename)
                
                # Verify file upload (optional but recommended)
                file_info = await kimi_client.get_file(file_id)
                logger.info(f"Kimi file uploaded: {file_info.get('filename')} (status: {file_info.get('status')})")
                
                # Pass file_id to parse_sku_input (Kimi will read the file in chat)
                llm_client = LLMClient()
                result = await llm_client.parse_sku_input(
                    input_text=input_text or "",
                    images=None,
                    file_ids=[file_id]
                )
            else:
                # Fallback: for other providers or image files, use direct processing
                docx_text = None
                if file_data and file_mime_type in (
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/msword'
                ):
                    try:
                        docx_text = ImportService._extract_docx_text(file_data)
                        logger.info(f"DOCX extracted {len(docx_text)} chars for task {task_id}")
                    except Exception as e:
                        logger.warning(f"DOCX extraction failed: {str(e)}")

                if docx_text:
                    # Merge original text with DOCX content
                    input_text = (input_text or "").strip()
                    if input_text:
                        input_text += "\n\n--- DOCX 内容 ---\n" + docx_text
                    else:
                        input_text = docx_text
                    images = None
                else:
                    # Prepare images list for LLM client
                    images = None
                    if file_data and file_mime_type:
                        images = [{
                            'data': file_data,
                            'mime_type': file_mime_type
                        }]
                        print(f"\n{'='*80}")
                        print(f"FILE UPLOAD DETECTED:")
                        print(f"  - MIME Type: {file_mime_type}")
                        print(f"  - File Size: {len(file_data)} bytes")
                        print(f"  - Input Text Length: {len(input_text) if input_text else 0} chars")
                        print(f"{'='*80}\n")
                
                llm_client = LLMClient()
                result = await llm_client.parse_sku_input(
                    input_text=input_text or "",
                    images=images
                )
            
            task.status = ImportStatus.PARSED
            task.extracted_fields = result.get("extracted_fields", {})
            task.confidence = result.get("confidence", {})
            task.evidence = result.get("evidence", {})
            task.parsed_result = result
            task.updated_at = datetime.utcnow()
            
            audit_log(
                db=db,
                agency_id=agency_id,
                user_id=user_id,
                action="import.parsed",
                entity_type="import_task",
                entity_id=task.id,
                after_data={"status": "parsed", "sku_type": result.get("sku_type")}
            )
            
        except Exception as e:
            task.status = ImportStatus.FAILED
            task.error_message = str(e)
            task.updated_at = datetime.utcnow()
            
            audit_log(
                db=db,
                agency_id=agency_id,
                user_id=user_id,
                action="import.failed",
                entity_type="import_task",
                entity_id=task.id,
                after_data={"error": str(e)}
            )
        
        db.commit()
        db.refresh(task)
        
        return task

    @staticmethod
    def _extract_docx_text(file_data: bytes) -> str:
        """Lightweight DOCX text extractor without extra dependencies."""
        with zipfile.ZipFile(io.BytesIO(file_data)) as zf:
            xml_bytes = zf.read('word/document.xml')
        root = ET.fromstring(xml_bytes)
        texts: List[str] = []
        for node in root.iter():
            if node.tag.endswith('}t') and node.text:
                texts.append(node.text)
        content = '\n'.join(texts).strip()
        if not content:
            raise ValueError("DOCX has no readable text")
        return content
