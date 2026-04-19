from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, text
from sqlalchemy.orm import relationship
from backend.database import Base

class RiskRuleCondition(Base):
    __tablename__ = "risk_rule_condition"

    id = Column(Integer, primary_key=True, autoincrement=True)

    rule_id = Column(Integer, ForeignKey("risk_rule.id", ondelete="CASCADE"), nullable=False)

    condition_group = Column(Integer, nullable=False)

    order_no = Column(Integer, nullable=False)

    field_name = Column(String(100), nullable=True)

    operator = Column(String(30), nullable=False)

    value_type = Column(String(20), nullable=False)

    numeric_value = Column(Float)
    string_value = Column(String(255))
    boolean_value = Column(Boolean)
    list_name = Column(String(100))

    score = Column(Integer, nullable=False)

    trigger_description = Column(String(500), nullable=False)

    is_active = Column(Boolean, server_default=text("true"))

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

    rule = relationship("RiskRule", back_populates="conditions")