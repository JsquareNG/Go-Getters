from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.auditTrail import AuditTrail

router = APIRouter(prefix="/audit-trail", tags=["audit-trail"])

@router.get("/getAuditTrails/{application_id}")
def get_audit_trail_by_application(application_id: str, db: Session = Depends(get_db)):
    logs = (
        db.query(AuditTrail)
        .filter(AuditTrail.application_id == application_id)
        .order_by(AuditTrail.created_at.asc())
        .all()
    )

    return [
        {
            "application_id": log.application_id,
            "actor_id": log.actor_id,
            "actor_type": log.actor_type,
            "event_type": log.event_type,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "from_status": log.from_status,
            "to_status": log.to_status,
            "description": log.description,
            "created_at": log.created_at,
        }
        for log in logs
    ]
