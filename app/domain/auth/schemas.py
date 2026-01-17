from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = "staff"


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: str
    agency_id: str
    username: str


class UserResponse(BaseModel):
    id: str
    agency_id: str
    username: str
    full_name: Optional[str]
    role: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True
