from fastapi import APIRouter, Depends, Body, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date
from zoneinfo import ZoneInfo

from backend.database import get_db
from backend.models.liveness_detection import LivenessDetection
from backend.services.kyc_media_service import download_upload_and_get_kyc_public_url

router = APIRouter(prefix="/liveness-detection", tags=["liveness_detection"])


def model_to_dict(obj):
    result = {}

    for c in obj.__table__.columns:
        value = getattr(obj, c.name)

        if c.name == "created_at" and value is not None and isinstance(value, datetime):
            if value.tzinfo is not None:
                value = value.astimezone(ZoneInfo("Asia/Singapore"))

            result[c.name] = value.strftime("%Y-%m-%d %H:%M:%S")

        elif isinstance(value, date) and not isinstance(value, datetime):
            result[c.name] = value.isoformat()

        else:
            result[c.name] = value

    return result


def parse_provider_created_at(value: str | None):
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid created_at format. Expected ISO format like 2026-03-11T09:30:42.745584Z"
        )


# =====================================================
# GET KYC BY SESSION ID
# =====================================================

@router.get("/bySessionID/{provider_session_id}")
def get_liveness_detection_by_session_id(
    provider_session_id: str,
    db: Session = Depends(get_db)
):

    row = (
        db.query(LivenessDetection)
        .filter(LivenessDetection.provider_session_id == provider_session_id)
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Liveness detection record not found")

    return model_to_dict(row)


# =====================================================
# CREATE KYC RECORD
# =====================================================

@router.post("/createDetection")
def create_liveness_detection(
    data: dict = Body(...),
    db: Session = Depends(get_db)
):

    provider_session_id = data.get("provider_session_id")

    if not provider_session_id:
        raise HTTPException(status_code=400, detail="provider_session_id is required")

    # prevent duplicates
    existing = (
        db.query(LivenessDetection)
        .filter(LivenessDetection.provider_session_id == provider_session_id)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="A liveness detection record with this provider_session_id already exists"
        )

    application_id = data.get("application_id")
    images = data.get("images") or {}

    # ---------------------------------------------------
    # IMPORTANT: choose storage reference
    # ---------------------------------------------------

    kyc_ref = application_id if application_id else provider_session_id

    # ---------------------------------------------------
    # DOWNLOAD FROM DIDIT → UPLOAD TO SUPABASE
    # ---------------------------------------------------

    converted_images = {
        "portrait_image_url": download_upload_and_get_kyc_public_url(
            images.get("portrait_image_url"), kyc_ref, "portrait", ".jpg"
        ),
        "front_image_url": download_upload_and_get_kyc_public_url(
            images.get("front_image_url"), kyc_ref, "front", ".jpg"
        ),
        "back_image_url": download_upload_and_get_kyc_public_url(
            images.get("back_image_url"), kyc_ref, "back", ".jpg"
        ),
        "full_front_pdf_url": download_upload_and_get_kyc_public_url(
            images.get("full_front_pdf_url"), kyc_ref, "full_front", ".pdf"
        ),
        "full_back_pdf_url": download_upload_and_get_kyc_public_url(
            images.get("full_back_pdf_url"), kyc_ref, "full_back", ".pdf"
        ),
        "liveness_reference_image_url": download_upload_and_get_kyc_public_url(
            images.get("liveness_reference_image_url"), kyc_ref, "liveness_reference", ".jpg"
        ),
        "liveness_video_url": download_upload_and_get_kyc_public_url(
            images.get("liveness_video_url"), kyc_ref, "liveness_video", ".mp4"
        ),
        "face_match_source_image_url": download_upload_and_get_kyc_public_url(
            images.get("face_match_source_image_url"), kyc_ref, "face_match_source", ".jpg"
        ),
        "face_match_target_image_url": download_upload_and_get_kyc_public_url(
            images.get("face_match_target_image_url"), kyc_ref, "face_match_target", ".jpg"
        ),
    }

    # ---------------------------------------------------
    # CREATE DATABASE RECORD
    # ---------------------------------------------------

    new_row = LivenessDetection(
        application_id=application_id,   # can be None
        provider=data.get("provider"),
        provider_session_id=provider_session_id,
        provider_session_number=data.get("provider_session_number"),
        workflow_id=data.get("workflow_id"),
        provider_session_url=data.get("provider_session_url"),

        overall_status=data.get("overall_status"),
        manual_review_required=data.get("manual_review_required", False),

        full_name=data.get("full_name"),
        document_type=data.get("document_type"),
        document_number=data.get("document_number"),
        document_number_masked=data.get("document_number_masked"),
        date_of_birth=data.get("date_of_birth"),
        gender=data.get("gender"),
        issuing_state_code=data.get("issuing_state_code"),
        formatted_address=data.get("formatted_address"),

        id_verification_status=data.get("id_verification_status"),
        liveness_status=data.get("liveness_status"),
        liveness_score=data.get("liveness_score"),
        face_match_status=data.get("face_match_status"),
        face_match_score=data.get("face_match_score"),

        has_duplicate_identity_hit=data.get("has_duplicate_identity_hit", False),
        has_duplicate_face_hit=data.get("has_duplicate_face_hit", False),

        risk_flags=data.get("risk_flags") or [],
        images=converted_images,

        created_at=parse_provider_created_at(data.get("created_at"))
    )

    db.add(new_row)
    db.commit()
    db.refresh(new_row)

    return {
        "message": "Liveness detection record created successfully",
        "data": model_to_dict(new_row)
    }


# =====================================================
# LINK APPLICATION AFTER DRAFT SAVE
# =====================================================

@router.put("/bySessionID/{provider_session_id}")
def update_liveness_detection_by_session_id(
    provider_session_id: str,
    data: dict = Body(...),
    db: Session = Depends(get_db)
):

    row = (
        db.query(LivenessDetection)
        .filter(LivenessDetection.provider_session_id == provider_session_id)
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Liveness detection record not found")

    if "application_id" in data:
        row.application_id = data.get("application_id")

    db.commit()
    db.refresh(row)

    return {
        "message": "Liveness detection record updated successfully",
        "data": model_to_dict(row)
    }

# =====================================================
# GET KYC BY APPLICATION ID
# =====================================================

@router.get("/byApplicationID/{application_id}")
def get_liveness_detection_by_application_id(
    application_id: str,
    db: Session = Depends(get_db)
):
    row = (
        db.query(LivenessDetection)
        .filter(LivenessDetection.application_id == application_id)
        .order_by(LivenessDetection.id.desc())
        .first()
    )

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Liveness detection record not found for this application_id"
        )

    return model_to_dict(row)

@router.get("/")
def get_all_liveness_detections(
    from_date: str | None = None,
    to_date: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(LivenessDetection).filter(
        LivenessDetection.application_id.isnot(None)
    )

    if from_date:
        query = query.filter(LivenessDetection.created_at >= from_date)

    if to_date:
        query = query.filter(LivenessDetection.created_at <= to_date)

    rows = query.order_by(LivenessDetection.created_at.desc()).all()

    return [model_to_dict(row) for row in rows]