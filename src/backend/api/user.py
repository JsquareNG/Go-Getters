from fastapi import APIRouter, Depends, Body, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import bcrypt  # pip install bcrypt

from backend.database import SessionLocal
from backend.models.user import User  # Adjust path if needed

router = APIRouter(prefix="/users", tags=["users"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

@router.post("/register")  # SME self-register
def register_sme(data: dict = Body(...), db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data["email"]).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")
    
    new_user = User(
        first_name=data["first_name"],
        last_name=data["last_name"],
        email=data["email"],
        password=hash_password(data["password"]),
        user_role="SME"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "user_id": new_user.user_id,
        "message": "SME registered successfully",
        "role": new_user.user_role
    }

@router.post("/login")  # SME/Staff login
def login(data: dict = Body(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data["email"]).first()
    if not user or not verify_password(data["password"], user.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    
    return {
        "user_id": user.user_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "role": user.user_role,
        "message": "Login successful"
    }

@router.get("/all-staff")
def get_all_staff(db: Session = Depends(get_db)):
    staff = db.query(User).filter(User.user_role == 'STAFF').all()
    return [{
        "user_id": u.user_id,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "email": u.email,
    } for u in staff]

@router.get("/all-sme")
def get_all_sme(db: Session = Depends(get_db)):
    sme = db.query(User).filter(User.user_role == 'SME').all()
    return [{
        "user_id": u.user_id,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "email": u.email,
    } for u in sme]

@router.post("/create-staff")  # Admin creates staff
def create_staff(data: dict = Body(...), db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data["email"]).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email exists")
    
    new_staff = User(
        first_name=data["first_name"],
        last_name=data["last_name"],
        email=data["email"],
        password=hash_password(data["password"]),  # Temp password
        user_role="STAFF"
    )
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    
    return {
        "user_id": new_staff.user_id,
        "message": "Staff created successfully"
    }

@router.get("/{user_id}")
def get_user_by_id(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    
    return {
        "user_id": user.user_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "user_role": user.user_role
    }
