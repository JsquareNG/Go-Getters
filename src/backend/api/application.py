from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models.application import ApplicationForm

router = APIRouter(prefix="/applications", tags=["applications"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def get_all_applications(db: Session = Depends(get_db)):
    apps = db.query(ApplicationForm).order_by(ApplicationForm.application_id.desc()).all()
    return [
        {"application_id": a.application_id, "status": a.status}
        for a in apps
    ]

@router.post("/create")
def create_application(db: Session = Depends(get_db)):
    new_app = ApplicationForm(status="Draft")  # always Draft
    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    return {
        "application_id": new_app.application_id,
        "status": new_app.status
    }



