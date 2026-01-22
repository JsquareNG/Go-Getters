from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    phone = Column(String)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_staff = Column(Boolean, default=False)  # True for DBS staff
    
    # Relationships
    applications = relationship("ApplicationForm", back_populates="user")
