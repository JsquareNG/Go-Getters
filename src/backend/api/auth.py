from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from backend.database import SessionLocal, Base, engine
from backend.core.security import create_access_token
from backend.crud.user import create_sme_user, authenticate_user, is_valid_staff
from backend.schemas.user import UserCreate, Token, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# SME Registration
@router.post("/register/sme", response_model=UserResponse)
def register_sme(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = create_sme_user(db, user)
    return new_user

# SME + Staff Login
@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Try DB user first (SME)
    user = authenticate_user(db, form_data.username, form_data.password)
    
    # If no DB user, check hardcoded staff
    if not user:
        if is_valid_staff(form_data.username, form_data.password):
            access_token = create_access_token(
                data={"sub": form_data.username, "type": "staff"},
                expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            )
            return Token(
                access_token=access_token,
                token_type="bearer",
                user_type="staff"
            )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # SME user
    access_token = create_access_token(
        data={"sub": user.email, "type": "sme"},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_type="sme"
    )

# Create tables (run once)
Base.metadata.create_all(bind=engine)
