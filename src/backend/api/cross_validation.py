from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, Field
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

        # if routing_decision == "SEND_BACK_TO_USER":
        #     application.current_status = "Requires Action"

        # elif routing_decision == "SEND_TO_RULES_ENGINE":
        #     application.current_status = "Under Review"

        # elif routing_decision == "SEND_TO_RULES_ENGINE_AND_MANUAL_REVIEW_AFTER":
        #     application.current_status = "Under Review"

        # db.commit()
        # db.refresh(application)

    return {
        "message": "Cross-validation completed using real application form data and submitted documents.",
        "application_id": application_id,
        "apply_result": apply_result,
        "cross_validation": result,
        "routing_decison": routing_decision
    }