from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.application import ApplicationForm
from backend.services.cross_validation.orchestrator import cross_validate_application

router = APIRouter(prefix="/cross-validation", tags=["Cross Validation"])


@router.post("/applications/run/{application_id}")
def run_cross_validation(
    application_id: str,
    apply_result: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    application = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.application_id == application_id)
        .first()
    )

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    result = cross_validate_application(
        db=db,
        application_id=application_id,
    )

    if apply_result:
        routing_decision = result.get("routing_decision")

    return {
        "message": "Cross-validation completed using real application form data and submitted documents.",
        "application_id": application_id,
        "apply_result": apply_result,
        "cross_validation": result,
        "routing_decison": routing_decision
    }