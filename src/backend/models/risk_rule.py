from sqlalchemy import Column, Integer, String, Boolean, DateTime, UniqueConstraint, text
from sqlalchemy.orm import relationship
from backend.database import Base


class RiskRule(Base):
    __tablename__ = "risk_rule"

    id = Column(Integer, primary_key=True, autoincrement=True)

    rule_code = Column(String(50), nullable=False, unique=True, index=True)

    rule_name = Column(String(255), nullable=False)

    category = Column(String(20), nullable=False)

    description = Column(String(500), nullable=True)

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

    conditions = relationship(
        "RiskRuleCondition",
        back_populates="rule",
        cascade="all, delete-orphan",
        order_by="RiskRuleCondition.order_no"
    )

    __table_args__ = (
        UniqueConstraint("rule_code", name="uq_risk_rule_code"),
    )