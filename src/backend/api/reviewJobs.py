from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
import mimetypes
import os

from backend.database import SessionLocal
from backend.models.reviewJobs import ReviewJobs
from backend.services.supabase_client import supabase, supabase_admin, BUCKET
from backend.database import get_db

router = APIRouter(prefix="/reviewJobs", tags=["reviewJobs"])
SUPABASE_URL = os.getenv("SUPABASE_URL")

@router.get("/getReviewJob/{application_id}")
def get_review_by_application_id(
    application_id: str,
    db: Session = Depends(get_db)
):
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