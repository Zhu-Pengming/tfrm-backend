from sqlalchemy.orm import Session
from app.infra.db import AuditLog
from typing import Optional, Dict, Any
import uuid
from datetime import datetime


def audit_log(
    db: Session,
    agency_id: str,
    user_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    before_data: Optional[Dict[str, Any]] = None,
    after_data: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
):
    log = AuditLog(
        id=f"AUDIT-{uuid.uuid4().hex[:12].upper()}",
        agency_id=agency_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_data=before_data,
        after_data=after_data,
        ip_address=ip_address,
        user_agent=user_agent,
        created_at=datetime.utcnow()
    )
    db.add(log)
    db.commit()
    return log
