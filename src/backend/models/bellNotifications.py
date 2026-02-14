import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import text
from backend.database import Base
from sqlalchemy.orm import relationship


class BellNotification(Base):
    __tablename__ = "bell_notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    application_id = Column(
        String(8),
        ForeignKey("application_form.application_id", ondelete="CASCADE"),
        nullable=False
    )

    recipient_id   = Column(String(8), nullable=False)

    from_status = Column(String(50), nullable=True)
    to_status   = Column(String(50), nullable=True)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, server_default=text("false"))

    created_at = Column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("(now() AT TIME ZONE 'Asia/Singapore')")
    )

    application = relationship("ApplicationForm", back_populates="bell_notifications")
