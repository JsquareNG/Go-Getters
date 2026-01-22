from sqlalchemy.orm import Session
from backend.models.user import User
from backend.schemas.user import UserCreate
from backend.core.security import get_password_hash, verify_password

# SME Registration
def create_sme_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        hashed_password=hashed_password,
        is_staff=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Login (SME + Staff)
def authenticate_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

# Staff check (hardcoded)
def is_valid_staff(email: str, password: str) -> bool:
    return (email == "davidng@dbs.sg" and password == "gogetters123")
