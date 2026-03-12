import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, text, Integer
from sqlalchemy.dialects.postgresql import JSONB
from backend.database import Base

class AuditTrail(Base):
    __tablename__ = "audit_trail"

    audit_id = Column(Integer, primary_key=True, autoincrement=True)

    application_id = Column(
        String(8),
        ForeignKey("application_form.application_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # who performed the action
    actor_id = Column(String(100), nullable=True)     # user or staff id
    actor_type = Column(String(100), nullable=True)  # USER / STAFF / SYSTEM

    # what happened
    event_type = Column(String(100), nullable=False)  # STATUS_CHANGED, REVIEW_STARTED, etc.
    entity_type = Column(String(50), nullable=False) # APPLICATION, REVIEW_JOB, ACTION_REQUEST
    entity_id = Column(String(36), nullable=True)    # job_id / action_request_id if relevant

    # optional status tracking
    from_status = Column(String(50), nullable=True)
    to_status = Column(String(50), nullable=True)

    # free-text summary for UI
    description = Column(String(500), nullable=True)

    created_at = Column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("(now() AT TIME ZONE 'Asia/Singapore')")
    )