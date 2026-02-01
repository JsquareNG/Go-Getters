from fastapi import APIRouter, Depends, Body, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from backend.database import SessionLocal
from backend.models.application import ApplicationForm
from backend.models.documents import Document
from backend.services.supabase_client import supabase_admin, BUCKET
from backend.api.notification import *
from backend.services.email import send_email


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
@router.post("/firstSave")
def save_application(data: dict = Body(...), db: Session = Depends(get_db)):
    new_app = ApplicationForm(
        business_country=data["business_country"],
        business_name=data['business_name'],
        user_id=data["user_id"],
        previous_status=None,      
        current_status="Draft"
    )

    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    return {
        "application_id": new_app.application_id,
        "status": new_app.current_status
    }

@router.put("/secondSave/{application_id}")
def second_save(application_id: str, data: dict = Body(...), db: Session = Depends(get_db)):

    app = db.query(ApplicationForm).filter(ApplicationForm.application_id == application_id).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # update fields
    for key, value in (data or {}).items():
        if key == "application_id":
            continue
        if hasattr(app, key):
            setattr(app, key, value)

    curr = app.current_status
    prev = app.previous_status
    app.is_open_user = False

    if curr == "Draft":
        app.current_status = "Draft"

    elif curr == "Requires Action" and prev == "Under Manual Review":
        app.previous_status = app.current_status
        app.current_status = "Draft"

    db.commit()
    db.refresh(app)

    return {
        "application_id": app.application_id,
        "previous_status": app.previous_status,
        "current_status": app.current_status,
    }


# Submitting an application
@router.post("/firstSubmit")
def first_submit_application(
    background_tasks: BackgroundTasks,
    data: dict = Body(...),
    db: Session = Depends(get_db),
):
    new_app = ApplicationForm(
        business_country=data["business_country"],
        business_name=data["business_name"],
        user_id=data["user_id"],
        # ✅ your requested statuses
        previous_status=None,               # blank in DB (NULL)
        current_status="Under Review",      # set current status
    )
    
    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    user_email = data.get('email')
    user_firstName = data.get('firstName')

    subject, body = build_application_submitted_email(new_app, user_firstName)
    background_tasks.add_task(send_email, user_email, subject, body)

    return {
        "application_id": new_app.application_id,
        "current_status": new_app.current_status,
    }

@router.put("/secondSubmit/{application_id}")
def second_submit(application_id: str, data: dict = Body(...), db: Session = Depends(get_db)):

    app = db.query(ApplicationForm).filter(ApplicationForm.application_id == application_id).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # update fields
    for key, value in (data or {}).items():
        if key == "application_id":
            continue
        if hasattr(app, key):
            setattr(app, key, value)

    curr = app.current_status
    prev = app.previous_status

    prev_blank = (prev is None) or (prev == "")
    app.is_open_user = False 

    if curr == "Draft" and prev_blank:
        app.previous_status = app.current_status
        app.current_status = "Under Review"

    elif curr == "Requires Action" and prev == "Under Manual Review":
        app.previous_status = app.current_status
        app.current_status = "Under Manual Review"
        app.is_open_staff = False

    elif curr == "Draft" and prev == "Requires Action":
        app.current_status = "Under Manual Review"
        app.is_open_staff = False


    db.commit()
    db.refresh(app)

    return {
        "application_id": app.application_id,
        "previous_status": app.previous_status,
        "current_status": app.current_status,
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

    curr = app.current_status

    if curr == "Under Review":
        app.previous_status = app.current_status
        app.current_status = "Under Manual Review"
    
    app.is_open_user = False

    db.commit()
    db.refresh(app)

    return {
        "application_id": app.application_id,
        "status": app.current_status,
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

    # Get storage paths BEFORE deleting app (cascade will remove document rows)
    docs = (
        db.query(Document)
        .filter(Document.application_id == application_id)
        .all()
    )
    paths = [d.storage_path for d in docs if getattr(d, "storage_path", None)]

    # Delete from storage first (service role bypasses Storage RLS)
    if paths:
        try:
            supabase_admin.storage.from_(BUCKET).remove(paths)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete storage objects: {str(e)}"
            )

    # Delete DB row (cascade deletes documents)
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

    reason = data.get("reason")

    # Only require reason if approving from Under Manual Review
    if app.current_status == "Under Manual Review":
        if reason is None or str(reason).strip() == "":
            raise HTTPException(status_code=400, detail="reason is required when approving from Under Manual Review")

    # Status update
    app.previous_status = app.current_status
    app.current_status = "Approved"
    app.reason = reason  # will be None if not provided
    app.is_open_user = False

    db.commit()
    db.refresh(app)

    return {
        "application_id": app.application_id,
        "status": app.current_status,
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
    app.previous_status = app.current_status
    app.current_status = "Rejected"
    app.reason = reason  # save approval reason

    db.commit()
    db.refresh(app)
    app.is_open_user = False
    
    return {
        "application_id": app.application_id,
        "status": app.current_status,
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

    app.previous_status = app.current_status
    app.current_status = "Requires Action"
    app.reason = reason  # save approval reason
    app.is_open_user = False

    db.commit()
    db.refresh(app)

    return {
        "application_id": app.application_id,
        "status": app.current_status,
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
    
    app.previous_status = app.current_status
    app.current_status = "Withdrawn"
    app.is_open_user = False
    app.is_open_staff = False

    db.commit()
    db.refresh(app)

    return {
        "application_id": app.application_id,
        "status": app.current_status,
        "reviewer_id": app.reviewer_id
    }

def staff_message(app: ApplicationForm) -> str:
    # Staff only cares about statuses relevant to review
    if app.current_status == "Under Manual Review":
        if app.previous_status == "Requires Action":
            return "Applicant uploaded additional documents. Please review the application again."
        return "You have an active application due for manual review."
    
    if app.current_status == "Withdrawn":
        return "This application has been withdrawn by the user."

@router.get("/notifications/staff/{staff_id}")
def get_staff_notifications(staff_id: str, db: Session = Depends(get_db)):
    allowed_statuses = ["Under Manual Review", "Withdrawn"]
    apps = (
        db.query(ApplicationForm)
        .filter(
            ApplicationForm.reviewer_id == staff_id,
            ApplicationForm.current_status.in_(allowed_statuses)
        )
        .order_by(desc(ApplicationForm.last_edited))
        .all()
    )

    unopened = [a for a in apps if not a.is_open_staff]

    notifications = [
        {
            "application_id": a.application_id,
            "message": staff_message(a),
        }
        for a in unopened
    ]

    return {
        "total": len(notifications),
        "notifications": notifications
    }

def user_message(app: ApplicationForm) -> str:
    # Draft stale
    if app.current_status == "Draft":

        today = datetime.now().date()                 # relies on machine timezone being SGT
        last_date = app.last_edited.date()
        if app.previous_status == "Requires Action":
            if today >= (last_date + timedelta(days=3)):  # Jan 31 -> Feb 3
                return "Your application has not been edited for more than 48 hours."
            else:
                return "Your application has been saved."
        else:   
            if today >= (last_date + timedelta(days=3)):  # Jan 31 -> Feb 3
                return "Your draft application has not been edited for more than 48 hours."
            else:
                return "Your draft application has been saved."

    if app.current_status == "Under Review":
        return "Your application has been submitted successfully and is currently under review."

    if app.current_status == "Under Manual Review":
        # Could be from Requires Action -> Under Manual Review (docs uploaded) OR Under Review -> Under Manual Review
        return "Your application is currently under manual review by our bank staff."

    if app.current_status == "Requires Action":
        return "This application requires additional documents. Please upload the requested documents."

    if app.current_status == "Approved":
        return "Your application has been approved."

    if app.current_status == "Rejected":
        return "Your application has been rejected."

    if app.current_status == "Withdrawn":
        return "Your application has been withdrawn successfully."

@router.get("/notifications/user/{user_id}")
def get_user_notifications(user_id: str, db: Session = Depends(get_db)):
    apps = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.user_id == user_id)
        .order_by(desc(ApplicationForm.last_edited))
        .all()
    )

    # Panel shows only "unopened" items (optional - you can show all if you want)
    unopened = [a for a in apps if not a.is_open_user]
    notifications = [
        {
            "application_id": a.application_id,
            "message": user_message(a)
        }
        for a in unopened
    ]

    return {
        "total": len(notifications),
        "notifications": notifications
    }

@router.put("/markUserNotificationsOpen/{user_id}")
def mark_user_notifications_open(user_id: str, db: Session = Depends(get_db)):
    db.query(ApplicationForm)\
      .filter(
          ApplicationForm.user_id == user_id,
          ApplicationForm.is_open_user == False
      )\
      .update(
          {"is_open_user": True},
          synchronize_session=False
      )
    db.commit()
    return {"message": "ok"}

@router.put("/markStaffNotificationsOpen/{staff_id}")
def mark_staff_notifications_open(staff_id: str, db: Session = Depends(get_db)
):
    db.query(ApplicationForm)\
      .filter(
          ApplicationForm.reviewer_id == staff_id,
          ApplicationForm.is_open_staff == False
      )\
      .update(
          {"is_open_staff": True},
          synchronize_session=False
      )
    db.commit()
    return {"message": "ok"}

@router.put("/markOneStaffApplication/{staff_id}/{application_id}")
def mark_staff_one_open(staff_id: str, application_id: str, db: Session = Depends(get_db)):
    updated = db.query(ApplicationForm)\
      .filter(
          ApplicationForm.application_id == application_id,
          ApplicationForm.reviewer_id == staff_id
      )\
      .update({"is_open_staff": True}, synchronize_session=False)

    if updated == 0:
        return {"message": "no-op"}  # or raise 404

    db.commit()
    return {"message": "ok"}


@router.put("/markOneUserApplication/{user_id}/open/{application_id}")
def mark_staff_one_open(user_id: str, application_id: str, db: Session = Depends(get_db)):
    updated = db.query(ApplicationForm)\
      .filter(
          ApplicationForm.application_id == application_id,
          ApplicationForm.user_id == user_id
      )\
      .update({"is_open_user": True}, synchronize_session=False)

    if updated == 0:
        return {"message": "no-op"}  # or raise 404

    db.commit()
    return {"message": "ok"}
