from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Tuple
import logging
import sys
import io

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

from app.infra.db import get_db, init_db
from app.infra.audit import audit_log
from app.domain.auth.schemas import UserCreate, UserLogin, Token, UserResponse
from app.domain.auth.service import AuthService
from app.domain.auth.dependencies import get_current_user, get_current_user_optional
from app.domain.skus.schemas import SKUCreate, SKUUpdate, SKUResponse
from app.domain.skus.pricing_schemas import PriceCalendarUpdate, BatchPricingUpdate, BatchSKUUpdate, BatchSKUDelete, AvailabilityResponse
from app.domain.skus.service import SKUService
from app.domain.imports.schemas import ImportTaskCreate, ImportTaskResponse, ImportConfirm
from app.domain.imports.service import ImportService
from app.domain.quotations.schemas import QuotationCreate, QuotationUpdate, QuotationResponse, QuotationItemResponse
from app.domain.quotations.service import QuotationService
from app.domain.pricing.service import PricingService
from app.domain.products.schemas import ProductCreate, ProductUpdate, ProductResponse
from app.domain.products.service import ProductService
from app.domain.vendors.schemas import VendorCreate, VendorUpdate, VendorResponse, VendorNoteUpdate
from app.domain.vendors.service import VendorService
from app.domain.cooperations.schemas import CooperationCreate, CooperationApprove, CooperationResponse, PublicSKUQuery, SKUPublishRequest
from app.domain.cooperations.service import CooperationService
from app.domain.notifications.schemas import NotificationResponse, NotificationMarkRead
from app.domain.notifications.service import NotificationService
from app.infra.storage import StorageClient
from app.config import get_settings

from datetime import timedelta

settings = get_settings()

app = FastAPI(
    title="TFRM API",
    description="旅行社碎片化资源智能管理系统",
    version="1.0.0"
)

cors_origins = settings.cors_allowed_origins or []
if settings.app_env == "development" and settings.cors_allow_all_in_dev:
    cors_origins = ["*"]
elif not cors_origins:
    logger.warning("CORS allowed origins is empty; cross-origin requests will be blocked. Set cors_allowed_origins in production.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"REQUEST: {request.method} {request.url.path}")
    logger.info(f"  Headers: {dict(request.headers)}")
    response = await call_next(request)
    logger.info(f"RESPONSE: {response.status_code}")
    return response

storage_client = StorageClient()


@app.on_event("startup")
def startup_event():
    init_db()


@app.get("/")
def read_root():
    return {
        "message": "TFRM API is running",
        "version": "1.0.0",
        "docs": "/docs"
    }


# ---------------------- Product APIs ----------------------
@app.post("/products", response_model=ProductResponse)
def create_product(
    product_data: ProductCreate,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    product = ProductService.create_product(db, agency_id, user_id, product_data)
    return ProductService.with_skus(db, agency_id, product)


@app.get("/products", response_model=List[ProductResponse])
def list_products(
    product_type: Optional[str] = None,
    city: Optional[str] = None,
    keyword: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    products = ProductService.list_products(db, agency_id, product_type, city, keyword, skip, limit)
    return [ProductService.with_skus(db, agency_id, p) for p in products]


@app.get("/products/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: str,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    product = ProductService.get_product(db, agency_id, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductService.with_skus(db, agency_id, product)


@app.put("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: str,
    product_data: ProductUpdate,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    product = ProductService.update_product(db, agency_id, user_id, product_id, product_data)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductService.with_skus(db, agency_id, product)


@app.post("/products/{product_id}/skus", response_model=SKUResponse)
def create_product_sku(
    product_id: str,
    sku_data: SKUCreate,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    sku = ProductService.attach_sku(db, agency_id, user_id, product_id, sku_data)
    if not sku:
        raise HTTPException(status_code=404, detail="Product not found")
    return sku


@app.post("/auth/register", response_model=UserResponse)
def register(
    user_data: UserCreate,
    agency_name: str,
    db: Session = Depends(get_db)
):
    from app.infra.db import User
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    agency = AuthService.create_agency(db, agency_name)
    user = AuthService.create_user(db, agency.id, user_data)
    
    return user


@app.post("/auth/login", response_model=Token)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    user = AuthService.authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = AuthService.create_access_token(
        data={
            "user_id": user.id,
            "agency_id": user.agency_id,
            "username": user.username
        }
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me")
def get_current_user_info(
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.infra.db import Agency
    user_id, agency_id, username = current_user
    user = AuthService.get_user_by_id(db, user_id)
    
    # 获取 agency 信息
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "agency_id": user.agency_id,
        "agency_name": agency.name if agency else "未知机构",
        "role": user.role,
        "created_at": user.created_at
    }


@app.get("/test-auth")
def test_auth(current_user: Tuple[str, str, str] = Depends(get_current_user)):
    """Test endpoint to verify authentication"""
    user_id, agency_id, username = current_user
    return {
        "authenticated": True,
        "user_id": user_id,
        "agency_id": agency_id,
        "username": username
    }


@app.post("/test-form")
async def test_form(
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    input_text: Optional[str] = Form(None)
):
    """Test endpoint to verify FormData parsing"""
    logger.info(f"TEST FORM - input_text: {repr(input_text)}")
    return {
        "received": True,
        "input_text": input_text,
        "length": len(input_text) if input_text else 0
    }


@app.post("/skus/batch-pricing")
def batch_update_pricing(
    pricing_data: BatchPricingUpdate,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Batch update SKU pricing with margin/factor/amount"""
    user_id, agency_id, username = current_user
    
    updated_count = SKUService.batch_update_pricing(
        db, agency_id, user_id,
        pricing_data.sku_ids,
        pricing_data.margin_percentage,
        pricing_data.multiply_factor,
        float(pricing_data.add_amount) if pricing_data.add_amount else None
    )
    
    return {"message": f"Updated {updated_count} SKUs", "count": updated_count}


@app.post("/skus/batch-update")
def batch_update_skus(
    update_data: BatchSKUUpdate,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Batch update SKU fields"""
    user_id, agency_id, username = current_user
    
    updates = update_data.model_dump(exclude={'sku_ids'}, exclude_none=True)
    updated_count = SKUService.batch_update_skus(db, agency_id, user_id, update_data.sku_ids, updates)
    
    return {"message": f"Updated {updated_count} SKUs", "count": updated_count}


@app.post("/skus/batch-delete")
def batch_delete_skus(
    delete_data: BatchSKUDelete,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Batch delete SKUs"""
    user_id, agency_id, username = current_user
    
    deleted_count = SKUService.batch_delete_skus(db, agency_id, user_id, delete_data.sku_ids)
    
    return {"message": f"Deleted {deleted_count} SKUs", "count": deleted_count}


@app.post("/skus/pull/{public_sku_id}", response_model=SKUResponse)
def pull_public_sku(
    public_sku_id: str,
    apply_factor: bool = True,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    sku = PricingService.pull_public_sku(db, agency_id, user_id, public_sku_id, apply_factor)
    if not sku:
        raise HTTPException(status_code=404, detail="Public SKU not found or not accessible")
    return sku


@app.post("/skus/{sku_id}/publish", response_model=SKUResponse)
def publish_sku(
    sku_id: str,
    visibility_scope: str = "all",
    partner_whitelist: Optional[List[str]] = None,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Publish a private SKU to the public resource repository"""
    user_id, agency_id, username = current_user
    sku = SKUService.publish_sku(db, agency_id, user_id, sku_id, visibility_scope, partner_whitelist)
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    return sku


@app.post("/skus", response_model=SKUResponse)
def create_sku(
    sku_data: SKUCreate,
    current_user: Tuple[str, str, str] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    logger.info(f"Creating SKU: {sku_data.sku_name}")
    logger.info(f"  - Agency ID: {agency_id}")
    logger.info(f"  - User ID: {user_id}")
    logger.info(f"  - SKU Type: {sku_data.sku_type}")
    
    try:
        sku = SKUService.create_sku(db, agency_id, user_id, sku_data)
        logger.info(f"SKU created successfully: {sku.id}")
        return sku
    except Exception as e:
        logger.error(f"Error creating SKU: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to create SKU: {str(e)}")


@app.get("/skus/{sku_id}", response_model=SKUResponse)
def get_sku(
    sku_id: str,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    sku = SKUService.get_sku(db, agency_id, sku_id)
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    return sku


@app.get("/skus/{sku_id}/availability", response_model=AvailabilityResponse)
def get_sku_availability(
    sku_id: str,
    days: int = 30,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return resolved daily price with priority: calendar > rule > fixed, then pricing factors."""
    user_id, agency_id, username = current_user
    sku = SKUService.get_sku(db, agency_id, sku_id)
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    
    days = max(1, min(days, 90))
    availability = PricingService.build_availability(db, agency_id, sku, days)
    return availability


@app.put("/skus/{sku_id}", response_model=SKUResponse)
def update_sku(
    sku_id: str,
    sku_data: SKUUpdate,
    current_user: Tuple[str, str, str] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    sku = SKUService.update_sku(db, agency_id, user_id, sku_id, sku_data)
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    return sku


@app.delete("/skus/{sku_id}")
def delete_sku(
    sku_id: str,
    current_user: Tuple[str, str, str] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    success = SKUService.delete_sku(db, agency_id, user_id, sku_id)
    if not success:
        raise HTTPException(status_code=404, detail="SKU not found")
    return {"message": "SKU deleted successfully"}


@app.put("/skus/{sku_id}/price-calendar", response_model=SKUResponse)
def update_price_calendar(
    sku_id: str,
    calendar_data: PriceCalendarUpdate,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update price calendar for a SKU"""
    user_id, agency_id, username = current_user
    
    calendar_items = [item.model_dump() for item in calendar_data.items]
    sku = SKUService.update_price_calendar(db, agency_id, user_id, sku_id, calendar_items)
    
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    return sku


@app.get("/skus", response_model=List[SKUResponse])
def list_skus(
    sku_type: Optional[str] = None,
    city: Optional[str] = None,
    tags: Optional[str] = None,
    status: Optional[str] = None,
    owner_type: Optional[str] = None,
    keyword: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: Tuple[str, str, str] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    
    tags_list = tags.split(",") if tags else None
    
    skus = SKUService.list_skus(
        db, agency_id, sku_type, city, tags_list, status, owner_type, keyword, skip, limit
    )
    return skus


@app.post("/imports", response_model=ImportTaskResponse)
def create_import_task(
    task_data: ImportTaskCreate,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    task = ImportService.create_import_task(db, agency_id, user_id, task_data)
    return task


@app.get("/imports/{task_id}", response_model=ImportTaskResponse)
def get_import_task(
    task_id: str,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    task = ImportService.get_import_task(db, agency_id, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Import task not found")
    return task


@app.get("/imports", response_model=List[ImportTaskResponse])
def list_import_tasks(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    tasks = ImportService.list_import_tasks(db, agency_id, status, skip, limit)
    return tasks


@app.post("/imports/{task_id}/confirm")
def confirm_import_task(
    task_id: str,
    confirm_data: ImportConfirm,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    sku_id = ImportService.confirm_import(db, agency_id, user_id, task_id, confirm_data)
    if not sku_id:
        raise HTTPException(status_code=400, detail="Cannot confirm import task")
    return {"message": "Import confirmed", "sku_id": sku_id}


@app.delete("/imports/{task_id}")
def delete_import_task(
    task_id: str,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    task = ImportService.get_import_task(db, agency_id, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Import task not found")
    
    db.delete(task)
    db.commit()
    
    audit_log(
        db=db,
        agency_id=agency_id,
        user_id=user_id,
        action="import.delete",
        entity_type="import_task",
        entity_id=task_id,
        before_data={"status": task.status}
    )
    
    return {"message": "Import task deleted successfully"}


@app.post("/imports/upload")
async def upload_import_file(
    file: UploadFile = File(...),
    current_user: Tuple[str, str, str] = Depends(get_current_user)
):
    """Upload file for import processing (images, PDFs, documents)"""
    user_id, agency_id, username = current_user
    
    logger.info(f"File upload for import - User: {username}, File: {file.filename}, Type: {file.content_type}")
    
    # Upload file to storage
    file_path = await storage_client.upload_file(file.file, file.filename)
    file_url = storage_client.get_file_url(file_path)
    
    logger.info(f"File uploaded successfully - Path: {file_path}, URL: {file_url}")
    
    return {
        "url": file_url,
        "file_id": file_path,
        "filename": file.filename,
        "content_type": file.content_type
    }


@app.post("/imports/extract", response_model=ImportTaskResponse)
async def extract_with_ai(
    request: Request,
    current_user: Tuple[str, str, str] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    AI-powered extraction endpoint supporting GetYourGuide 4-layer architecture
    Accepts either text input or file upload (images, PDFs)
    """
    logger.info("="*80)
    logger.info("EXTRACT ENDPOINT CALLED")
    logger.info(f"  - User: {current_user[2]}")
    logger.info(f"  - Agency: {current_user[1]}")
    logger.info(f"  - Content-Type: {request.headers.get('content-type')}")
    logger.info("="*80)
    
    user_id, agency_id, username = current_user
    
    input_text = None
    file_data = None
    file_mime_type = None
    uploaded_file_url = None
    
    # Parse FormData manually
    try:
        form = await request.form()
        logger.info(f"Form keys: {list(form.keys())}")
        
        if 'input_text' in form:
            input_text = form['input_text']
            logger.info(f"  - input_text received: {len(input_text)} chars")
            logger.info(f"  - input_text preview: {input_text[:100]}...")
        
        if 'file' in form:
            file = form['file']
            file_data = await file.read()
            file_mime_type = file.content_type
            logger.info(f"  - File received: {file.filename}, type: {file_mime_type}, size: {len(file_data)} bytes")
            
            # Store file locally for use as card background
            if file_data:
                from io import BytesIO
                file_path = await storage_client.upload_file(BytesIO(file_data), file.filename, folder="imports")
                uploaded_file_url = storage_client.get_file_url(file_path)
                logger.info(f"  - File stored at: {uploaded_file_url}")
    except Exception as e:
        logger.error(f"Error parsing form data: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to parse form data: {str(e)}")
    
    if not input_text and not file_data:
        logger.error(f"Validation failed - no input_text or file provided")
        raise HTTPException(status_code=400, detail="Either input_text or file must be provided")
    
    task = await ImportService.extract_with_ai(
        db, agency_id, user_id, input_text, file_data, file_mime_type, uploaded_file_url
    )
    
    return task


@app.post("/quotations", response_model=QuotationResponse)
def create_quotation(
    quotation_data: QuotationCreate,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    quotation = QuotationService.create_quotation(db, agency_id, user_id, quotation_data)
    return quotation


@app.get("/quotations/{quotation_id}", response_model=QuotationResponse)
def get_quotation(
    quotation_id: str,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    quotation = QuotationService.get_quotation(db, agency_id, quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quotation


@app.get("/quotations/{quotation_id}/items", response_model=List[QuotationItemResponse])
def get_quotation_items(
    quotation_id: str,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    quotation = QuotationService.get_quotation(db, agency_id, quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    items = QuotationService.get_quotation_items(db, quotation_id)
    return items


@app.put("/quotations/{quotation_id}", response_model=QuotationResponse)
def update_quotation(
    quotation_id: str,
    quotation_data: QuotationUpdate,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    quotation = QuotationService.update_quotation(db, agency_id, user_id, quotation_id, quotation_data)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quotation


@app.post("/quotations/{quotation_id}/publish")
def publish_quotation(
    quotation_id: str,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    published_url = QuotationService.publish_quotation(db, agency_id, user_id, quotation_id)
    if not published_url:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return {"message": "Quotation published", "url": published_url}


@app.get("/quotations/{quotation_id}/export/pdf")
def export_quotation_pdf(
    quotation_id: str,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export quotation as PDF"""
    user_id, agency_id, username = current_user
    
    # Get quotation
    quotation = QuotationService.get_quotation(db, agency_id, quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    # Get items
    items = QuotationService.get_quotation_items(db, quotation_id)
    
    # Convert to dict for PDF generator
    from app.domain.quotations.pdf_generator import QuotationPDFGenerator
    
    quotation_dict = {
        'id': quotation.id,
        'title': quotation.title,
        'customer_name': quotation.customer_name,
        'customer_contact': quotation.customer_contact,
        'total_amount': quotation.total_amount,
        'discount_amount': quotation.discount_amount,
        'final_amount': quotation.final_amount,
        'notes': quotation.notes
    }
    
    items_list = [
        {
            'snapshot': item.snapshot,
            'quantity': item.quantity,
            'unit_price': item.unit_price,
            'subtotal': item.subtotal
        }
        for item in items
    ]
    
    # Generate PDF
    generator = QuotationPDFGenerator()
    pdf_buffer = generator.generate(quotation_dict, items_list)
    
    # Return as streaming response
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=quotation_{quotation_id}.pdf"
        }
    )


@app.get("/share/quotations/{share_token}")
def get_shared_quotation(
    share_token: str,
    db: Session = Depends(get_db)
):
    """Public quotation share page - no authentication required but uses opaque token"""
    from app.infra.db import Quotation
    
    quotation = db.query(Quotation).filter(
        Quotation.share_token == share_token,
        Quotation.status == "published"
    ).first()
    
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found or not published")
    
    items = QuotationService.get_quotation_items(db, quotation.id)
    
    return {
        "quotation": {
            "id": quotation.id,
            "title": quotation.title,
            "customer_name": quotation.customer_name,
            "total_amount": float(quotation.total_amount) if quotation.total_amount else 0,
            "discount_amount": float(quotation.discount_amount) if quotation.discount_amount else 0,
            "final_amount": float(quotation.final_amount) if quotation.final_amount else 0,
            "notes": quotation.notes,
            "published_at": quotation.published_at.isoformat() if quotation.published_at else None,
            "share_token": quotation.share_token
        },
        "items": [
            {
                "id": item.id,
                "snapshot": item.snapshot,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price) if item.unit_price else 0,
                "subtotal": float(item.subtotal) if item.subtotal else 0,
                "custom_title": item.custom_title,
                "custom_description": item.custom_description
            }
            for item in items
        ]
    }


@app.get("/quotations", response_model=List[QuotationResponse])
def list_quotations(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    quotations = QuotationService.list_quotations(db, agency_id, status, skip, limit)
    return quotations




@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: Tuple[str, str, str] = Depends(get_current_user)
):
    file_path = await storage_client.upload_file(file.file, file.filename)
    file_url = storage_client.get_file_url(file_path)
    return {"file_path": file_path, "file_url": file_url}


@app.get("/files/{folder}/{filename}")
def download_file(
    folder: str,
    filename: str,
    current_user: Tuple[str, str, str] = Depends(get_current_user)
):
    """Authenticated download endpoint to prevent public guessing."""
    try:
        path = storage_client.resolve_local_path(f"/{folder}/{filename}")
    except ValueError:
        raise HTTPException(status_code=404, detail="File not found")

    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(path)


# ---------------------- Cooperation APIs ----------------------
@app.post("/cooperations", response_model=CooperationResponse)
def create_cooperation_request(
    request_data: CooperationCreate,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """发起合作申请"""
    user_id, agency_id, username = current_user
    cooperation = CooperationService.create_cooperation_request(db, agency_id, user_id, request_data)
    return cooperation


@app.get("/cooperations", response_model=List[CooperationResponse])
def list_cooperations(
    role: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """查询合作关系列表"""
    user_id, agency_id, username = current_user
    cooperations = CooperationService.list_cooperations(db, agency_id, role, status, skip, limit)
    return cooperations


@app.post("/cooperations/{cooperation_id}/approve", response_model=CooperationResponse)
def approve_cooperation(
    cooperation_id: str,
    approve_data: CooperationApprove,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """审核通过合作申请"""
    user_id, agency_id, username = current_user
    cooperation = CooperationService.approve_cooperation(db, agency_id, user_id, cooperation_id, approve_data)
    if not cooperation:
        raise HTTPException(status_code=404, detail="Cooperation not found or not pending")
    return cooperation


@app.post("/cooperations/{cooperation_id}/reject", response_model=CooperationResponse)
def reject_cooperation(
    cooperation_id: str,
    approve_data: CooperationApprove,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """拒绝合作申请"""
    user_id, agency_id, username = current_user
    cooperation = CooperationService.reject_cooperation(db, agency_id, user_id, cooperation_id, approve_data)
    if not cooperation:
        raise HTTPException(status_code=404, detail="Cooperation not found or not pending")
    return cooperation


@app.post("/cooperations/{cooperation_id}/terminate", response_model=CooperationResponse)
def terminate_cooperation(
    cooperation_id: str,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """终止合作关系"""
    user_id, agency_id, username = current_user
    cooperation = CooperationService.terminate_cooperation(db, agency_id, user_id, cooperation_id)
    if not cooperation:
        raise HTTPException(status_code=404, detail="Cooperation not found or not approved")
    return cooperation


@app.post("/skus/{sku_id}/publish", response_model=SKUResponse)
def publish_sku_to_public(
    sku_id: str,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """发布SKU到公共库"""
    user_id, agency_id, username = current_user
    sku = CooperationService.publish_sku_to_public(db, agency_id, user_id, sku_id)
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    return sku


@app.get("/public-skus", response_model=List[SKUResponse])
def browse_public_skus(
    city: Optional[str] = None,
    category: Optional[str] = None,
    tags: Optional[str] = None,
    keyword: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """浏览公共库SKU"""
    user_id, agency_id, username = current_user
    tags_list = tags.split(",") if tags else None
    skus = CooperationService.browse_public_skus(db, agency_id, city, category, tags_list, keyword, skip, limit)
    return skus


@app.post("/public-skus/{sku_id}/copy", response_model=SKUResponse)
def copy_public_sku_to_private(
    sku_id: str,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """将公共库SKU复制到私有库"""
    user_id, agency_id, username = current_user
    try:
        sku = CooperationService.copy_public_sku_to_private(db, agency_id, user_id, sku_id)
        if not sku:
            raise HTTPException(status_code=404, detail="Public SKU not found")
        return sku
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


# ---------------------- Notification APIs ----------------------
@app.get("/notifications", response_model=List[NotificationResponse])
def list_notifications(
    type: Optional[str] = None,
    is_read: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """查询通知列表"""
    user_id, agency_id, username = current_user
    notifications = NotificationService.list_notifications(db, agency_id, user_id, type, is_read, skip, limit)
    return notifications


@app.get("/notifications/unread-count")
def get_unread_count(
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取未读通知数量"""
    user_id, agency_id, username = current_user
    count = NotificationService.get_unread_count(db, agency_id, user_id)
    return {"count": count}


@app.post("/notifications/mark-read")
def mark_notifications_read(
    mark_data: NotificationMarkRead,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """标记通知为已读"""
    user_id, agency_id, username = current_user
    count = NotificationService.mark_as_read(db, agency_id, mark_data.notification_ids)
    return {"marked_count": count}


# ---------------------- Vendor APIs ----------------------
@app.post("/vendors", response_model=VendorResponse)
def create_vendor(
    vendor_data: VendorCreate,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    vendor = VendorService.create_vendor(db, agency_id, user_id, vendor_data)
    return vendor


@app.get("/vendors/{vendor_id}", response_model=VendorResponse)
def get_vendor(
    vendor_id: str,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    vendor = VendorService.get_vendor(db, agency_id, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@app.get("/vendors", response_model=List[VendorResponse])
def list_vendors(
    category: Optional[str] = None,
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    vendors = VendorService.list_vendors(
        db, agency_id, category, status, keyword, skip, limit
    )
    return vendors


@app.put("/vendors/{vendor_id}", response_model=VendorResponse)
def update_vendor(
    vendor_id: str,
    vendor_data: VendorUpdate,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    vendor = VendorService.update_vendor(db, agency_id, user_id, vendor_id, vendor_data)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@app.put("/vendors/{vendor_id}/notes", response_model=VendorResponse)
def update_vendor_note(
    vendor_id: str,
    note_data: VendorNoteUpdate,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    vendor = VendorService.update_vendor_note(db, agency_id, vendor_id, note_data.note)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@app.delete("/vendors/{vendor_id}")
def delete_vendor(
    vendor_id: str,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    success = VendorService.delete_vendor(db, agency_id, user_id, vendor_id)
    if not success:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"message": "Vendor deleted successfully"}


@app.post("/vendors/{vendor_id}/generate-logo")
async def generate_vendor_logo(
    vendor_id: str,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate logo for vendor using AI"""
    user_id, agency_id, username = current_user
    
    logo_url = await VendorService.generate_vendor_logo(db, agency_id, vendor_id)
    
    if not logo_url:
        raise HTTPException(status_code=500, detail="Failed to generate logo")
    
    return {"logo_url": logo_url, "message": "Logo generated successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

