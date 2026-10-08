from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.system import AuditLog, Notification
from backend.app.schemas.finance import AuditLogOut
from backend.app.auth.jwt import get_current_user, require_role

router = APIRouter(prefix="/audit-logs", tags=["audit"])
financial_required = require_role("FINANCIAL_DEPARTMENT")

@router.get("", response_model=List[AuditLogOut])
def get_audit_logs(
    action: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(financial_required),
    db: Session = Depends(get_db)
):
    q = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if action:
        q = q.filter(AuditLog.action == action)
    logs = q.limit(limit).all()

    return [
        AuditLogOut(
            id=log.id,
            user_id=log.user_id,
            user_name=log.user.full_name if log.user else "System",
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            details=log.details,
            created_at=log.created_at
        )
        for log in logs
    ]
