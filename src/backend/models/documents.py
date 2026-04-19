import uuid
from backend.database import Base
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict

from sqlalchemy import Column, String, ForeignKey, DateTime, text
from sqlalchemy.orm import relationship


class Document(Base):
    __tablename__ = "documents"

    document_id = Column(
        String(36),
        primary_key=True,
        nullable=False,
        default=lambda: str(uuid.uuid4()) 
    )

    application_id = Column(
        String(8),
        ForeignKey("application_form.application_id", ondelete="CASCADE"),
        nullable=False
    )

    document_type = Column(String(50), nullable=False)    
    original_filename = Column(String(255), nullable=True)
    mime_type = Column(String(100), nullable=True)
    storage_path = Column(String(500), nullable=False)     

    status = Column(String(30), nullable=False, server_default=text("'uploaded'"))

    created_at = Column(DateTime(timezone=True), server_default=text("now()"), nullable=False)

    extracted_data = Column(MutableDict.as_mutable(JSONB), default=dict)

    application = relationship(
    "ApplicationForm",
    back_populates="documents"
)
