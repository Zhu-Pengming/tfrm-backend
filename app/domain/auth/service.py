from sqlalchemy.orm import Session
from app.infra.db import User, Agency
from app.domain.auth.schemas import UserCreate
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from app.config import get_settings
from typing import Optional
import uuid

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        return pwd_context.hash(password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> Optional[dict]:
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            return payload
        except JWTError:
            return None
    
    @staticmethod
    def create_user(db: Session, agency_id: str, user_data: UserCreate) -> User:
        user_id = f"USER-{uuid.uuid4().hex[:12].upper()}"
        
        hashed_password = AuthService.get_password_hash(user_data.password)
        
        user = User(
            id=user_id,
            agency_id=agency_id,
            username=user_data.username,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            role=user_data.role,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return user
    
    @staticmethod
    def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return None
        if not AuthService.verify_password(password, user.hashed_password):
            return None
        return user
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def create_agency(db: Session, name: str, agency_type: str = "travel_agency") -> Agency:
        agency_id = f"AGENCY-{uuid.uuid4().hex[:8].upper()}"
        
        agency = Agency(
            id=agency_id,
            name=name,
            type=agency_type,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(agency)
        db.commit()
        db.refresh(agency)
        
        return agency
