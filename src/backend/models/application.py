from backend.database import Base
from sqlalchemy import Column, String, CheckConstraint, event, DDL, text, DateTime, func, Boolean
from sqlalchemy.orm import relationship

class ApplicationForm(Base):
    __tablename__ = "application_form"

    documents = relationship(
        "Document",
        back_populates="application",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    # 8-digit application id, auto-generated in DB
    application_id = Column(
        String(8),
        primary_key=True,
        unique=True,
        nullable=False,
        server_default=text("lpad(nextval('application_id_seq')::text, 8, '0')")
    )

    business_name = Column(String(255), nullable=False)
    business_country = Column(String(50), nullable=False)
    business_type = Column(String(255), nullable=False)
    previous_status = Column(String(50), nullable=True)
    current_status = Column(String(50), nullable=False)
    user_id = Column(String(8), nullable=False)
    reviewer_id = Column(String(8), nullable=True)
    reason = Column(String(500), nullable=True)
    is_open_user = Column(Boolean,nullable=False, server_default=text("false"))
    is_open_staff = Column(Boolean,nullable=False, server_default=text("false"))
    has_sent = Column(Boolean, nullable=False, default=False, server_default="false")
    

    # Store as SGT-naive timestamp (TIMESTAMP WITHOUT TIME ZONE)
    last_edited = Column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("(now() AT TIME ZONE 'Asia/Singapore')"),
        onupdate=text("(now() AT TIME ZONE 'Asia/Singapore')"),
    )

    __table_args__ = (
        CheckConstraint("char_length(application_id) = 8", name="chk_application_id_len"),
    )

# Create the sequence before the table is created (PostgreSQL)
event.listen(
    ApplicationForm.__table__,
    "before_create",
    DDL("CREATE SEQUENCE IF NOT EXISTS application_id_seq START WITH 1 INCREMENT BY 1;")
)


