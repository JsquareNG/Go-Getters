from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models.application import ApplicationForm

router = APIRouter(prefix="/applications", tags=["applications"])

def to_dict(self):
    return {c.name: getattr(self, c.name) for c in self.__table__.columns}


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
        {c.name: getattr(a, c.name) for c in a.__table__.columns}
        for a in apps
    ]

# Get Application by User ID
@router.get("/byUserID/{user_id}")
def get_application_by_user_id(user_id: str, db: Session = Depends(get_db)):
    apps = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.user_id == user_id)
        .order_by(ApplicationForm.application_id.desc()).all()
    )

    if not apps:
        raise HTTPException(status_code=404, detail="User not found")
    
    return [
        {c.name: getattr(a, c.name) for c in a.__table__.columns}
        for a in apps
    ]

# Get Application by Employee ID
@router.get("/byEmployeeID/{reviewer_id}")
def get_application_by_user_id(reviewer_id: str, db: Session = Depends(get_db)):
    apps = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.reviewer_id == reviewer_id)
        .order_by(ApplicationForm.application_id.desc()).all()
    )

    if not apps:
        raise HTTPException(status_code=404, detail="User not found")
    
    return [
        {c.name: getattr(a, c.name) for c in a.__table__.columns}
        for a in apps
    ]

# Get Application by Application ID
@router.get("/byAppID/{application_id}")
def get_application_by_app_id(application_id: str, db: Session = Depends(get_db)):
    app = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.application_id == application_id)
        .first()
    )

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    return {c.name: getattr(app, c.name) for c in app.__table__.columns}

# Saving Application as Draft
@router.post("/save")
def save_application(data: dict = Body(...), db: Session = Depends(get_db)):
    new_app = ApplicationForm(
        business_country=data["business_country"],
        business_name=data['business_name'],
        status="Draft"
    )

    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    return {
        "application_id": new_app.application_id,
        "status": new_app.status
    }

# Submitting an application
@router.post("/submit")
def save_application(data: dict = Body(...), db: Session = Depends(get_db)):
    new_app = ApplicationForm(
        business_country=data["business_country"],
        business_name=data['business_name'],
        status="Under Review",
        user_id=data["user_id"],
        reviewer_id=data['reviewer_id']
    )

    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    return {
        "application_id": new_app.application_id,
        "status": new_app.status
    }

@router.put("/needManualReview/{application_id}")
def need_manual_review(
    application_id: str,
    data: dict = Body(default={}),   # body optional for now
    db: Session = Depends(get_db)
):
    app = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.application_id == application_id)
        .first()
    )

    app.status = "Under Manual Review"

    db.commit()
    db.refresh(app)

    return {
        "application_id": app.application_id,
        "status": app.status,
        "reviewer_id": app.reviewer_id
    }


# User discarding their draft application
@router.delete("/delete/{application_id}")
def delete_application(application_id: str, db: Session = Depends(get_db)):
    app = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.application_id == application_id)
        .first()
    )

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    db.delete(app)
    db.commit()

    return {
        "message": "Application deleted successfully",
        "application_id": application_id
    }


# Reviewer approving the application
@router.put("/approve/{application_id}")
def approve_application(application_id: str, data: dict = Body(...), db: Session = Depends(get_db)):
    app = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.application_id == application_id)
        .first()
    )

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    reason = data["reason"]

    app.status = "Approved"
    app.reason = reason  # save approval reason

    db.commit()
    db.refresh(app)

    return {
        "application_id": app.application_id,
        "status": app.status,
        "reason": app.reason,
        "reviewer_id": app.reviewer_id
    }

# Reviewer rejecting the application
@router.put("/reject/{application_id}")
def approve_application(application_id: str, data: dict = Body(...), db: Session = Depends(get_db)):
    app = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.application_id == application_id)
        .first()
    )

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    reason = data.get("reason")

    app.status = "Rejected"
    app.reason = reason  # save approval reason

    db.commit()
    db.refresh(app)

    return {
        "application_id": app.application_id,
        "status": app.status,
        "reason": app.reason,
        "reviewer_id": app.reviewer_id
    }

# Reviewer escalating the application back to user
@router.put("/escalate/{application_id}")
def approve_application(application_id: str, data: dict = Body(...), db: Session = Depends(get_db)):
    app = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.application_id == application_id)
        .first()
    )

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    reason = data.get("reason")

    app.status = "Requires Action"
    app.reason = reason  # save approval reason

    db.commit()
    db.refresh(app)

    return {
        "application_id": app.application_id,
        "status": app.status,
        "reason": app.reason,
        "reviewer_id": app.reviewer_id
    }

# Reviewer escalating the application back to user
@router.put("/withdraw/{application_id}")
def approve_application(application_id: str, db: Session = Depends(get_db)):
    app = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.application_id == application_id)
        .first()
    )

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.status = "Withdrawn"

    db.commit()
    db.refresh(app)

    return {
        "application_id": app.application_id,
        "status": app.status,
        "reviewer_id": app.reviewer_id
    }
