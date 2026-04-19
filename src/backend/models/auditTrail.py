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

    actor_id = Column(String(100), nullable=True)    
    actor_type = Column(String(100), nullable=True)  

    event_type = Column(String(100), nullable=False)  
    entity_type = Column(String(50), nullable=False) 
    entity_id = Column(String(36), nullable=True)    

    from_status = Column(String(50), nullable=True)
    to_status = Column(String(50), nullable=True)

    description = Column(String(500), nullable=True)

    created_at = Column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("(now() AT TIME ZONE 'Asia/Singapore')")
    )