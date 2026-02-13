import uuid
from backend.database import Base
# from database import Base

from sqlalchemy import Column, String, ForeignKey, DateTime, text, Integer
from sqlalchemy.orm import relationship


class ReviewJobs(Base):
    __tablename__ = "reviewJobs"

    job_id = Column(
        String(36),
        primary_key=True,
        nullable=False,
        default=lambda: str(uuid.uuid4()),   # generates in Python
    )

    application_id = Column(
        String(8),
        ForeignKey("application_form.application_id", ondelete="CASCADE"),
        nullable=False,
        unique=True  # one review job per application
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

    last_error = Column(String(1000), nullable=True)

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

