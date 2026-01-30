from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.infra.db import get_db
from app.domain.auth.service import AuthService
from app.domain.auth.schemas import TokenData
from typing import Tuple, Optional

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Tuple[str, str, str]:
    """
    验证 JWT Token 并返回当前用户信息
    返回: (user_id, agency_id, username)
    """
    import logging
    logger = logging.getLogger(__name__)
    
    token = credentials.credentials
    
    logger.info("="*80)
    logger.info("AUTHENTICATION ATTEMPT")
    logger.info(f"  - Token (first 20 chars): {token[:20]}...")
    logger.info("="*80)
    
    try:
        payload = AuthService.decode_token(token)
        user_id: str = payload.get("user_id")
        agency_id: str = payload.get("agency_id")
        username: str = payload.get("username")
        
        logger.info(f"Token decoded successfully:")
        logger.info(f"  - User ID: {user_id}")
        logger.info(f"  - Agency ID: {agency_id}")
        logger.info(f"  - Username: {username}")
        
        if user_id is None or agency_id is None:
            logger.error("ERROR: Missing user_id or agency_id in token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = AuthService.get_user_by_id(db, user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user_id, agency_id, username
        
    except Exception as e:
        logger.error(f"Authentication ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
    db: Session = Depends(get_db)
) -> Tuple[str, str, str]:
    """
    可选认证：如果提供token则验证，否则使用默认测试用户
    返回: (user_id, agency_id, username)
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # 如果没有提供token，使用默认测试用户
    if credentials is None:
        logger.warning("No authentication provided for optional auth dependency")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 如果提供了token，正常验证
    token = credentials.credentials
    
    logger.info("="*80)
    logger.info("OPTIONAL AUTHENTICATION ATTEMPT")
    logger.info(f"  - Token (first 20 chars): {token[:20]}...")
    logger.info("="*80)
    
    try:
        payload = AuthService.decode_token(token)
        user_id: str = payload.get("user_id")
        agency_id: str = payload.get("agency_id")
        username: str = payload.get("username")
        
        logger.info(f"Token decoded successfully:")
        logger.info(f"  - User ID: {user_id}")
        logger.info(f"  - Agency ID: {agency_id}")
        logger.info(f"  - Username: {username}")
        
        if user_id is None or agency_id is None:
            logger.error("ERROR: Missing user_id or agency_id in token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = AuthService.get_user_by_id(db, user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user_id, agency_id, username
        
    except Exception as e:
        logger.error(f"Authentication ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
