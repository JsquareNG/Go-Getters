import uuid
from backend.database import Base

from sqlalchemy import Column, String, ForeignKey, DateTime, text, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB


class ReviewJobs(Base):
    __tablename__ = "reviewJobs"

    job_id = Column(
        String(36),
        primary_key=True,
        nullable=False,
        default=lambda: str(uuid.uuid4()),
    )

    application_id = Column(
        String(8),
        ForeignKey("application_form.application_id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    status = Column(
        String(50),
        nullable=False,
        server_default=text("'QUEUED'")
    )

    attempts = Column(
        Integer,
        nullable=False,
        server_default=text("0")
    )

    locked_at = Column(DateTime(timezone=True), nullable=True)
    worker_id = Column(String(100), nullable=True)

    # keep your existing field
    last_error = Column(String(1000), nullable=True)

    # ✅ NEW: risk results
    risk_score = Column(Integer, nullable=True)
    risk_grade = Column(String(20), nullable=True)

    # ✅ NEW: store triggered rules as JSON array
    # e.g. [{"rule_id":"R001","name":"High-risk country","severity":"HIGH","points":40,"reason":"..."}]
    rules_triggered = Column(
        JSONB,
        nullable=False,
        server_default=text("'[]'::jsonb")
    )

    # ✅ NEW: when the review completed
    completed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("(now() AT TIME ZONE 'Asia/Singapore')")
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("(now() AT TIME ZONE 'Asia/Singapore')"),
        onupdate=text("(now() AT TIME ZONE 'Asia/Singapore')"),
    )

    application = relationship("ApplicationForm", back_populates="review_jobs")