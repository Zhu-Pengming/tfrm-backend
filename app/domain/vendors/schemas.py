from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class VendorCreate(BaseModel):
    name: str
    logo: Optional[str] = None
    contact: str
    phone: str
    email: EmailStr
    category: List[str]
    specialties: List[str]
    address: Optional[str] = None
    note: Optional[str] = None


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    logo: Optional[str] = None
    contact: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    category: Optional[List[str]] = None
    specialties: Optional[List[str]] = None
    status: Optional[str] = None
    address: Optional[str] = None
    note: Optional[str] = None


class VendorNoteUpdate(BaseModel):
    note: str


class VendorResponse(BaseModel):
    id: str
    agency_id: str
    name: str
    logo: Optional[str]
    contact: str
    phone: str
    email: str
    category: List[str]
    specialties: List[str]
    status: str
    rating: float
    address: str
    note: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
