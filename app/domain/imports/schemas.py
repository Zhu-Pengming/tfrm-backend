from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class ImportTaskCreate(BaseModel):
    input_text: Optional[str] = None
    input_files: Optional[List[str]] = None


class ImportTaskResponse(BaseModel):
    id: str
    agency_id: str
    user_id: str
    status: str
    input_text: Optional[str]
    input_files: Optional[List[str]]
    uploaded_file_url: Optional[str]
    parsed_result: Optional[Dict[str, Any]]  # Full parsed result including sku_type
    extracted_fields: Optional[Dict[str, Any]]
    confidence: Optional[Any]  # Can be float (overall) or Dict[str, float] (per field)
    evidence: Optional[Dict[str, Any]]  # Dict with field evidence details
    error_message: Optional[str]
    created_sku_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ImportConfirm(BaseModel):
    extracted_fields: Dict[str, Any]
    sku_type: str
