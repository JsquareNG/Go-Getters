from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Date, DateTime,
    ForeignKey, text
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict, MutableList
from backend.database import Base


class LivenessDetection(Base):
    __tablename__ = "liveness_detection"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Internal FK to your application_form table
    # nullable=True because sometimes this record may come in first,
    # and you link it later
    application_id = Column(
        String(8),
        ForeignKey("application_form.application_id", ondelete="SET NULL"),
        nullable=True
    )

    provider = Column(String(50), nullable=False)
    provider_session_id = Column(String(100), nullable=False, unique=True)
    provider_session_number = Column(Integer, nullable=True)
    workflow_id = Column(String(100), nullable=True)
    provider_session_url = Column(String(500), nullable=True)

    overall_status = Column(String(50), nullable=True)
    manual_review_required = Column(Boolean, nullable=False, server_default=text("false"))

    full_name = Column(String(255), nullable=True)
    document_type = Column(String(100), nullable=True)
    document_number = Column(String(100), nullable=True)
    document_number_masked = Column(String(100), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)
    issuing_state_code = Column(String(10), nullable=True)
    formatted_address = Column(String(500), nullable=True)

    id_verification_status = Column(String(50), nullable=True)
    liveness_status = Column(String(50), nullable=True)
    liveness_score = Column(Float, nullable=True)
    face_match_status = Column(String(50), nullable=True)
    face_match_score = Column(Float, nullable=True)

    has_duplicate_identity_hit = Column(Boolean, nullable=False, server_default=text("false"))
    has_duplicate_face_hit = Column(Boolean, nullable=False, server_default=text("false"))

    # Store list of strings like:
    # ["LOW_FACE_MATCH_SIMILARITY", "POSSIBLE_DUPLICATED_USER"]
    risk_flags = Column(MutableList.as_mutable(JSONB), nullable=True, default=list)

    # Store the images object as JSONB
    images = Column(MutableDict.as_mutable(JSONB), nullable=True, default=dict)

    # Store provider timestamp in canonical UTC
    created_at = Column(DateTime(timezone=True), nullable=False)

    application = relationship("ApplicationForm", back_populates="liveness_detections")