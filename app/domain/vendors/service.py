from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime
import uuid
import httpx
import base64

from app.infra.db import Vendor
from app.domain.vendors.schemas import VendorCreate, VendorUpdate
from app.config import get_settings

settings = get_settings()


class VendorService:
    
    @staticmethod
    def create_vendor(db: Session, agency_id: str, user_id: str, vendor_data: VendorCreate) -> Vendor:
        vendor = Vendor(
            id=str(uuid.uuid4()),
            agency_id=agency_id,
            name=vendor_data.name,
            logo=vendor_data.logo,
            contact=vendor_data.contact,
            phone=vendor_data.phone,
            email=vendor_data.email,
            category=vendor_data.category,
            specialties=vendor_data.specialties,
            status="Active",
            rating=5.0,
            address=vendor_data.address,
            note=vendor_data.note,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(vendor)
        db.commit()
        db.refresh(vendor)
        return vendor
    
    @staticmethod
    def get_vendor(db: Session, agency_id: str, vendor_id: str) -> Optional[Vendor]:
        return db.query(Vendor).filter(
            Vendor.id == vendor_id,
            Vendor.agency_id == agency_id
        ).first()
    
    @staticmethod
    def list_vendors(
        db: Session,
        agency_id: str,
        category: Optional[str] = None,
        status: Optional[str] = None,
        keyword: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Vendor]:
        query = db.query(Vendor).filter(Vendor.agency_id == agency_id)
        
        if category and category != "All":
            query = query.filter(Vendor.category.contains([category]))
        
        if status and status != "All":
            query = query.filter(Vendor.status == status)
        
        if keyword:
            search_pattern = f"%{keyword}%"
            query = query.filter(
                or_(
                    Vendor.name.ilike(search_pattern),
                    Vendor.contact.ilike(search_pattern),
                    Vendor.address.ilike(search_pattern),
                    Vendor.note.ilike(search_pattern)
                )
            )
        
        return query.order_by(Vendor.created_at.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def update_vendor(
        db: Session,
        agency_id: str,
        user_id: str,
        vendor_id: str,
        vendor_data: VendorUpdate
    ) -> Optional[Vendor]:
        vendor = VendorService.get_vendor(db, agency_id, vendor_id)
        if not vendor:
            return None
        
        update_data = vendor_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(vendor, key, value)
        
        vendor.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(vendor)
        return vendor
    
    @staticmethod
    def update_vendor_note(
        db: Session,
        agency_id: str,
        vendor_id: str,
        note: str
    ) -> Optional[Vendor]:
        vendor = VendorService.get_vendor(db, agency_id, vendor_id)
        if not vendor:
            return None
        
        vendor.note = note
        vendor.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(vendor)
        return vendor
    
    @staticmethod
    def delete_vendor(db: Session, agency_id: str, user_id: str, vendor_id: str) -> bool:
        vendor = VendorService.get_vendor(db, agency_id, vendor_id)
        if not vendor:
            return False
        
        db.delete(vendor)
        db.commit()
        return True
    
    @staticmethod
    async def generate_vendor_logo(
        db: Session,
        agency_id: str,
        vendor_id: str
    ) -> Optional[str]:
        """Generate logo for vendor using Google Imagen API"""
        vendor = VendorService.get_vendor(db, agency_id, vendor_id)
        if not vendor:
            return None
        
        if not settings.gemini_api_key:
            raise Exception("Gemini API key not configured")
        
        # Build prompt
        category_labels = ", ".join(vendor.category)
        prompt = f"""A professional, minimalist, modern corporate logo for a travel partner named "{vendor.name}". 
Industry categories: {category_labels}. 
Clean flat vector design, isolated on white background, high quality, suitable for business use."""
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key={settings.gemini_api_key}",
                    json={
                        "instances": [{
                            "prompt": prompt
                        }],
                        "parameters": {
                            "sampleCount": 1,
                            "aspectRatio": "1:1",
                            "safetyFilterLevel": "block_some",
                            "personGeneration": "dont_allow"
                        }
                    }
                )
                
                if response.status_code != 200:
                    raise Exception(f"Imagen API error: {response.text}")
                
                result = response.json()
                
                if "predictions" in result and result["predictions"]:
                    # Get base64 image data
                    image_data = result["predictions"][0].get("bytesBase64Encoded")
                    if image_data:
                        # Convert to data URL
                        logo_url = f"data:image/png;base64,{image_data}"
                        
                        # Update vendor with logo
                        vendor.logo = logo_url
                        vendor.updated_at = datetime.utcnow()
                        db.commit()
                        
                        return logo_url
                
                return None
                
        except Exception as e:
            print(f"Logo generation error: {e}")
            return None
