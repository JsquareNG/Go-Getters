from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import os

from backend.auth.dependencies import get_current_user
from backend.models.reviewJobs import ReviewJobs
from backend.database import get_db

router = APIRouter(prefix="/reviewJobs", tags=["reviewJobs"])
SUPABASE_URL = os.getenv("SUPABASE_URL")


def _current_user_role(current_user: dict) -> str:
    role = current_user.get("role")
    if not role:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return str(role).upper().strip()


def _ensure_staff_or_management(current_user: dict):
    role = _current_user_role(current_user)
    if role not in {"STAFF", "MANAGEMENT"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden",
        )


@router.get("/getReviewJob/{application_id}")
def get_review_by_application_id(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_staff_or_management(current_user)

    job = (
        db.query(ReviewJobs)
        .filter(ReviewJobs.application_id == application_id)
        .first()
    )

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Review job not found for this application"
        )

    return {
        "job_id": job.job_id,
        "application_id": job.application_id,
        "status": job.status,
        "risk_score": job.risk_score,
        "risk_grade": job.risk_grade,
        "rules_triggered": job.rules_triggered,
        "completed_at": job.completed_at,
        "created_at": job.created_at,
        "updated_at": job.updated_at
    }


@router.get("/")
def get_all_review_jobs(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_staff_or_management(current_user)

    rows = (
        db.query(ReviewJobs)
        .order_by(ReviewJobs.created_at.desc(), ReviewJobs.job_id.desc())
        .all()
    )

    return [
        {
            "job_id": job.job_id,
            "application_id": job.application_id,
            "status": job.status,
            "risk_score": job.risk_score,
            "risk_grade": job.risk_grade,
            "rules_triggered": job.rules_triggered or [],
            "completed_at": job.completed_at,
            "created_at": job.created_at,
            "updated_at": job.updated_at
        }
        for job in rows
    ]