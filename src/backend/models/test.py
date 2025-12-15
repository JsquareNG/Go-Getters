from backend.database import Base
from sqlalchemy import Column, Integer, String


class SME(Base):
    __tablename__ = "smes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    country = Column(String)
    business_type = Column(String)
    onboarding_status = Column(String, default="pending")
