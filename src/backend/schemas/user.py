from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_type: str  # "sme" or "staff"

class UserResponse(UserBase):
    id: int
    is_staff: bool
    
    class Config:
        from_attributes = True
