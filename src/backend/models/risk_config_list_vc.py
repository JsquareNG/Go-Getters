from sqlalchemy import Column, Integer, String, DateTime, text
from backend.database import Base


class RiskConfigListVersion(Base):
    __tablename__ = "risk_config_list_version"

    list_name = Column(String(100), primary_key=True)
    version = Column(Integer, nullable=False, server_default=text("1"))

    updated_at = Column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("(now() AT TIME ZONE 'Asia/Singapore')"),
    )