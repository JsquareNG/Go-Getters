from fastapi import APIRouter, Depends, Body, HTTPException, status
from sqlalchemy.orm import Session
import bcrypt

from backend.auth.jwt import create_access_token
from backend.auth.dependencies import get_current_user
from backend.models.user import User
from backend.database import get_db

router = APIRouter(prefix="/users", tags=["users"])


# =====================================================
# Helpers
# =====================================================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _current_user_id(current_user: dict) -> str:
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return user_id


def _current_user_role(current_user: dict) -> str:
    role = current_user.get("role")
    if not role:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return str(role).upper().strip()


def _require_roles(current_user: dict, *allowed_roles: str):
    role = _current_user_role(current_user)
    allowed = {r.upper().strip() for r in allowed_roles}
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden",
        )


def _get_user_or_404(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


# =====================================================
# Public endpoints
# =====================================================

@router.post("/register")
def register_sme(data: dict = Body(...), db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data["email"]).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    new_user = User(
        first_name=data["first_name"],
        last_name=data["last_name"],
        email=data["email"],
        password=hash_password(data["password"]),
        user_role="SME",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "user_id": new_user.user_id,
        "message": "SME registered successfully",
        "role": new_user.user_role,
    }


@router.post("/login")
def login(data: dict = Body(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data["email"]).first()

    if not user or not verify_password(data["password"], user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token({
        "user_id": user.user_id,
        "role": user.user_role,
    })

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.user_id,
        "role": user.user_role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
    }
    
@router.get("/all-staff")
def get_all_staff(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_roles(current_user, "STAFF", "MANAGEMENT")

    staff = db.query(User).filter(User.user_role == "STAFF").all()

    return [
        {
            "user_id": u.user_id,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
        }
        for u in staff
    ]


@router.get("/all-sme")
def get_all_sme(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_roles(current_user, "STAFF", "MANAGEMENT")

    sme = db.query(User).filter(User.user_role == "SME").all()

    return [
        {
            "user_id": u.user_id,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
        }
        for u in sme
    ]


@router.post("/create-staff")
def create_staff(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Restrict this to MANAGEMENT only
    _require_roles(current_user, "MANAGEMENT")

    if db.query(User).filter(User.email == data["email"]).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email exists",
        )

    new_staff = User(
        first_name=data["first_name"],
        last_name=data["last_name"],
        email=data["email"],
        password=hash_password(data["password"]),
        user_role="STAFF",
    )
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)

    return {
        "user_id": new_staff.user_id,
        "message": "Staff created successfully",
    }

@router.post("/create-management")
def create_management(data: dict = Body(...), db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data["email"]).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email exists")
    
    new_management = User(
        first_name=data["first_name"],
        last_name=data["last_name"],
        email=data["email"],
        password=hash_password(data["password"]),  # Temp password
        user_role="MANAGAMENT"
    )
    db.add(new_management)
    db.commit()
    db.refresh(new_management)
    
    return {
        "user_id": new_management.user_id,
        "message": "Management created successfully"
    }

@router.get("/{user_id}")
def get_user_by_id(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    target_user = _get_user_or_404(db, user_id)

    current_role = _current_user_role(current_user)
    current_id = _current_user_id(current_user)

    # SME can only view own profile
    if current_role == "SME" and current_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden",
        )

    # STAFF / MANAGEMENT can view user records
    if current_role not in {"SME", "STAFF", "MANAGEMENT"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden",
        )

    return {
        "user_id": target_user.user_id,
        "first_name": target_user.first_name,
        "last_name": target_user.last_name,
        "email": target_user.email,
        "user_role": target_user.user_role,
    }