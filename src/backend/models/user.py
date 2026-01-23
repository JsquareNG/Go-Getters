from backend.database import Base
from sqlalchemy import Column, String, CheckConstraint, event, DDL, text

class User(Base):
    __tablename__ = "user"

    # 8-digit user id, auto-generated in DB (padded)
    user_id = Column(
        String(8),
        primary_key=True,
        unique=True,
        nullable=False,
        server_default=text("lpad(nextval('user_id_seq')::text, 8, '0')")
    )

    first_name = Column(String(50), nullable=False, autoincrement=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(255), nullable=False)  # Stores hash as per schema
    password = Column(String(255), nullable=False)
    mobile_number = Column(String(20), nullable=False)
    user_role = Column(String(50), nullable=False, server_default="STAFF")  # Default SME:STAFF

    __table_args__ = (
        CheckConstraint("char_length(user_id) = 8", name="chk_user_id_len"),
    )

# Create the sequence before the table is created (PostgreSQL)
event.listen(
    User.__table__,
    "before_create",
    DDL("CREATE SEQUENCE IF NOT EXISTS user_id_seq START WITH 1 INCREMENT BY 1;")
)
