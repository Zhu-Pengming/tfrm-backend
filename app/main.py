from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional, Tuple

from app.infra.db import get_db, init_db
from app.domain.auth.schemas import UserCreate, UserLogin, Token, UserResponse
from app.domain.auth.service import AuthService
from app.domain.auth.dependencies import get_current_user
from app.domain.skus.schemas import SKUCreate, SKUUpdate, SKUResponse
from app.domain.skus.service import SKUService
from app.domain.imports.schemas import ImportTaskCreate, ImportTaskResponse, ImportConfirm
from app.domain.imports.service import ImportService
from app.domain.quotations.schemas import QuotationCreate, QuotationUpdate, QuotationResponse, QuotationItemResponse
from app.domain.quotations.service import QuotationService
from app.domain.pricing.service import PricingService
from app.infra.storage import StorageClient

from datetime import timedelta

app = FastAPI(
    title="TFRM API",
    description="旅行社碎片化资源智能管理系统",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/auth/me", response_model=UserResponse)
def get_current_user_info(
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    user = AuthService.get_user_by_id(db, user_id)
    return user


@app.post("/skus", response_model=SKUResponse)
def create_sku(
    sku_data: SKUCreate,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    sku = SKUService.create_sku(db, agency_id, user_id, sku_data)
    return sku


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


@app.put("/skus/{sku_id}", response_model=SKUResponse)
def update_sku(
    sku_id: str,
    sku_data: SKUUpdate,
    current_user: Tuple[str, str, str] = Depends(get_current_user),
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
    current_user: Tuple[str, str, str] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id, agency_id, username = current_user
    success = SKUService.delete_sku(db, agency_id, user_id, sku_id)
    if not success:
        raise HTTPException(status_code=404, detail="SKU not found")
    return {"message": "SKU deleted successfully"}


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
    current_user: Tuple[str, str, str] = Depends(get_current_user),
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


@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: Tuple[str, str, str] = Depends(get_current_user)
):
    file_path = await storage_client.upload_file(file.file, file.filename)
    file_url = storage_client.get_file_url(file_path)
    return {"file_path": file_path, "file_url": file_url}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
