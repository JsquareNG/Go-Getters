from sqlalchemy import Column, Integer, String, Boolean, DateTime, UniqueConstraint, text
from sqlalchemy.sql import func
from backend.database import Base


class RiskConfigList(Base):
    __tablename__ = "risk_config_list"

    id = Column(Integer, primary_key=True, autoincrement=True)

    list_name = Column(String(100), nullable=False)
    item_value = Column(String(50), nullable=True)   # IR, KP, Casino
    item_label = Column(String(255), nullable=False)  # Iran, North Korea, Casino

    item_type = Column(String(50), nullable=False)    # country / industry
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    created_at = Column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("(now() AT TIME ZONE 'Asia/Singapore')")
    )

    updated_at = Column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("(now() AT TIME ZONE 'Asia/Singapore')"),
        onupdate=text("(now() AT TIME ZONE 'Asia/Singapore')")
    )