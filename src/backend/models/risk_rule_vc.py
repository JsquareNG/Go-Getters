from sqlalchemy import Column, Integer, String, DateTime, text
from backend.database import Base

class RiskRuleCategoryVersion(Base):
    __tablename__ = "risk_rule_category_version"

    category = Column(String(20), primary_key=True)
    version = Column(Integer, nullable=False, server_default=text("1"))

    updated_at = Column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("(now() AT TIME ZONE 'Asia/Singapore')")
    )