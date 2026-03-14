from fastapi import APIRouter, Depends, Body, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date
from zoneinfo import ZoneInfo

from backend.database import get_db
from backend.models.liveness_detection import LivenessDetection

router = APIRouter(prefix="/liveness-detection", tags=["liveness_detection"])


def model_to_dict(obj):
    result = {}

    for c in obj.__table__.columns:
        value = getattr(obj, c.name)

        if c.name == "created_at" and value is not None and isinstance(value, datetime):
            # convert aware datetime to Singapore time
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


@router.post("/createDetection")
def create_liveness_detection(
    data: dict = Body(...),
    db: Session = Depends(get_db)
):
    provider_session_id = data.get("provider_session_id")

    if not provider_session_id:
        raise HTTPException(status_code=400, detail="provider_session_id is required")

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

    images = data.get("images") or {}

    new_row = LivenessDetection(
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
        images=images,

        created_at=parse_provider_created_at(data.get("created_at"))
    )

    db.add(new_row)
    db.commit()
    db.refresh(new_row)

    return {
        "message": "Liveness detection record created successfully",
        "data": model_to_dict(new_row)
    }


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

    # only update fields if provided
    if "application_id" in data:
        row.application_id = data.get("application_id")

    db.commit()
    db.refresh(row)

    return {
        "message": "Liveness detection record updated successfully",
        "data": model_to_dict(row)
    }