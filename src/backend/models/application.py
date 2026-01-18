from backend.database import Base
from sqlalchemy import Column, String, CheckConstraint, event, DDL, text


class ApplicationForm(Base):
    __tablename__ = "application_form"

    # 8-digit application id, auto-generated in DB
    application_id = Column(
        String(8),
        primary_key=True,
        unique=True,
        nullable=False,
        server_default=text("lpad(nextval('application_id_seq')::text, 8, '0')")
    )

    status = Column(String(50), nullable=False, server_default="pending")

    __table_args__ = (
        CheckConstraint("char_length(application_id) = 8", name="chk_application_id_len"),
    )


# Create the sequence before the table is created (PostgreSQL)
event.listen(
    ApplicationForm.__table__,
    "before_create",
    DDL("CREATE SEQUENCE IF NOT EXISTS application_id_seq START WITH 1 INCREMENT BY 1;")
)
