import os
from fastapi import APIRouter, Depends, Body, HTTPException, BackgroundTasks, Header
from sqlalchemy.orm import Session
from sqlalchemy import desc, text, select, func

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from backend.database import SessionLocal
from backend.models.application import ApplicationForm
from backend.models.documents import Document
from backend.services.supabase_client import supabase_admin, BUCKET
from backend.models.user import User
from backend.api.notification import *
from backend.api.resend import send_email

router = APIRouter(prefix="/applications", tags=["applications"])

JOB_SECRET = os.getenv("JOB_SECRET", "")

EXCLUDED_STATUSES = ("Withdrawn", "Approved", "Rejected")  # not "active"


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
    if app.has_sent:
        app.has_sent = False

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
# @router.post("/firstSubmit")
# def first_submit_application(data: dict = Body(...), db: Session = Depends(get_db)):
#     new_app = ApplicationForm(
#         business_country=data["business_country"],
#         business_name=data["business_name"],
#         user_id=data["user_id"],
#         previous_status=None,
#         current_status="Under Review",
#     )

#     db.add(new_app)
#     db.commit()
#     db.refresh(new_app)

#     user_email = data.get("email")
#     user_firstName = data.get("firstName")

#     subject, body = build_application_submitted_email(new_app, user_firstName)

#     try:
#         send_email(user_email, subject, body)
#     except Exception as e:
#         # Don’t crash the API just because email failed
#         print("❌ Email failed:", str(e))
#         return {
#             "application_id": new_app.application_id,
#             "current_status": new_app.current_status,
#             "email_sent": False,
#             "email_error": str(e),
#         }

#     return {
#         "application_id": new_app.application_id,
#         "current_status": new_app.current_status,
#         "email_sent": True,
#     }

@router.post("/firstSubmit")
def first_submit_application(
    background_tasks: BackgroundTasks,
    data: dict = Body(...),
    db: Session = Depends(get_db),
):
    
    allowed = {c.name for c in ApplicationForm.__table__.columns}
    payload = {k: v for k, v in data.items() if k in allowed}

    payload["previous_status"] = None
    payload["current_status"] = "Under Review"

    new_app = ApplicationForm(**payload)

    # new_app = ApplicationForm(
    #     business_country=data["business_country"],
    #     business_name=data["business_name"],
    #     user_id=data["user_id"],
    #     previous_status=None,
    #     current_status="Under Review",
    # )

    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    user_email = data.get("email")
    user_firstName = data.get("firstName")

    def safe_send_email(to_email: str, subject: str, body: str):
        try:
            send_email(to_email, subject, body)
        except Exception as e:
            print(f"❌ Email failed to {to_email}: {e}")

    emails_queued = False
    email_notes = []

    if user_email:
        subject, body = build_application_submitted_email(new_app, user_firstName)
        background_tasks.add_task(safe_send_email, user_email, subject, body)
        emails_queued = True
    else:
        email_notes.append("Missing user email; email not queued.")

    return {
        "application_id": new_app.application_id,
        "current_status": new_app.current_status,
        "emails_queued": emails_queued,
        "email_notes": email_notes,
    }

# @router.put("/secondSubmit/{application_id}")
# def second_submit(application_id: str, data: dict = Body(...), db: Session = Depends(get_db)):

#     app = db.query(ApplicationForm).filter(ApplicationForm.application_id == application_id).first()
    
#     if not app:
#         raise HTTPException(status_code=404, detail="Application not found")
    
#     # update fields
#     for key, value in (data or {}).items():
#         if key == "application_id":
#             continue
#         if hasattr(app, key):
#             setattr(app, key, value)

#     curr = app.current_status
#     prev = app.previous_status

#     prev_blank = (prev is None) or (prev == "")
#     app.is_open_user = False 

#     user_email = data.get('email')
#     user_firstName = data.get('firstName')

#     if app.reviewer_id:
#         staff = db.query(User).filter(User.user_id == app.reviewer_id).first()
#         staff_email = staff.email
#         staff_firstName = staff.first_name

#     if curr == "Draft" and prev_blank:
#         app.previous_status = app.current_status
#         app.current_status = "Under Review"
#         subject, body = build_application_submitted_email(app, user_firstName)
#         # background_tasks.add_task(send_email, user_email, subject, body)

#         try:
#             send_email(user_email, subject, body)
#         except Exception as e:
#             # Don’t crash the API just because email failed
#             print("❌ Email failed:", str(e))
#             return {
#                 "application_id": app.application_id,
#                 "current_status": app.current_status,
#                 "email_sent": False,
#                 "email_error": str(e),
#             }

#         return {
#             "application_id": app.application_id,
#             "current_status": app.current_status,
#             "email_sent": True,
#         }

#     elif curr == "Requires Action" and prev == "Under Manual Review":
#         app.previous_status = app.current_status
#         app.current_status = "Under Manual Review"
#         app.is_open_staff = False

#         user_subject, user_body = build_user_manual_review_email(app, user_firstName)
#         # background_tasks.add_task(send_email, user_email, subject, body)
#         staff_subject, staff_body = build_staff_manual_review_email(app, staff_firstName)
#         # background_tasks.add_task(send_email, staff_email, subject, body)

#         errors = {}

#         try:
#             send_email(user_email, user_subject, user_body)
#         except Exception as e:
#             errors["user"] = str(e)

#         try:
#             send_email(staff_email, staff_subject, staff_body)
#         except Exception as e:
#             errors["staff"] = str(e)

#         return {
#             "application_id": app.application_id,
#             "current_status": app.current_status,
#             "email_sent": True,
#         }

#     elif curr == "Draft" and prev == "Requires Action":
#         app.current_status = "Under Manual Review"
#         app.is_open_staff = False
#         user_subject, user_body = build_user_manual_review_email(app, user_firstName)
#         # background_tasks.add_task(send_email, user_email, subject, body)
#         staff_subject, staff_body = build_staff_manual_review_email(app, staff_firstName)
#         # background_tasks.add_task(send_email, staff_email, subject, body)

#         errors = {}

#         try:
#             send_email(user_email, user_subject, user_body)
#         except Exception as e:
#             errors["user"] = str(e)

#         try:
#             send_email(staff_email, staff_subject, staff_body)
#         except Exception as e:
#             errors["staff"] = str(e)

#         return {
#             "application_id": app.application_id,
#             "current_status": app.current_status,
#             "email_sent": True,
#         }


#     db.commit()
#     db.refresh(app)

#     return {
#         "application_id": app.application_id,
#         "previous_status": app.previous_status,
#         "current_status": app.current_status,
#     }

@router.put("/secondSubmit/{application_id}")
def second_submit(
    application_id: str,
    background_tasks: BackgroundTasks,
    data: dict = Body(...),
    db: Session = Depends(get_db),
):
    app = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.application_id == application_id)
        .first()
    )

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # -----------------------------
    # Update fields
    # -----------------------------
    for key, value in (data or {}).items():
        if key == "application_id":
            continue
        if hasattr(app, key):
            setattr(app, key, value)

    curr = app.current_status
    prev = app.previous_status
    prev_blank = (prev is None) or (prev == "")

    app.is_open_user = False

    user_email = data.get("email")
    user_firstName = data.get("firstName")

    # -----------------------------
    # Resolve staff (if assigned)
    # -----------------------------
    staff_email = None
    staff_firstName = None
    if app.reviewer_id:
        staff = db.query(User).filter(User.user_id == app.reviewer_id).first()
        if staff:
            staff_email = staff.email
            staff_firstName = staff.first_name

    # -----------------------------
    # Helper: safe background send
    # -----------------------------
    def safe_send(to_email: str, subject: str, body: str):
        try:
            send_email(to_email, subject, body)
        except Exception as e:
            print(f"❌ Email failed to {to_email}: {e}")

    emails_queued = {"user": False, "staff": False}
    email_notes = []

    # -----------------------------
    # Branch logic
    # -----------------------------
    if curr == "Draft" and prev_blank:
        app.previous_status = app.current_status
        app.current_status = "Under Review"

        if user_email:
            subject, body = build_application_submitted_email(app, user_firstName)
            background_tasks.add_task(safe_send, user_email, subject, body)
            emails_queued["user"] = True
        else:
            email_notes.append("Missing user email; user email not queued.")

    elif curr == "Requires Action" and prev == "Under Manual Review":
        app.previous_status = app.current_status
        app.current_status = "Under Manual Review"
        app.is_open_staff = False

        # user email
        if user_email:
            user_subject, user_body = build_user_manual_review_email(app, user_firstName)
            background_tasks.add_task(safe_send, user_email, user_subject, user_body)
            emails_queued["user"] = True
        else:
            email_notes.append("Missing user email; user email not queued.")

        # staff email
        if staff_email:
            staff_subject, staff_body = build_staff_manual_review_email(app, staff_firstName)
            background_tasks.add_task(safe_send, staff_email, staff_subject, staff_body)
            emails_queued["staff"] = True
        else:
            email_notes.append("Missing staff/reviewer email; staff email not queued.")

    elif curr == "Draft" and prev == "Requires Action":
        app.previous_status = app.current_status
        app.current_status = "Under Manual Review"
        app.is_open_staff = False

        # user email
        if user_email:
            user_subject, user_body = build_user_manual_review_email(app, user_firstName)
            background_tasks.add_task(safe_send, user_email, user_subject, user_body)
            emails_queued["user"] = True
        else:
            email_notes.append("Missing user email; user email not queued.")

        # staff email
        if staff_email:
            staff_subject, staff_body = build_staff_manual_review_email(app, staff_firstName)
            background_tasks.add_task(safe_send, staff_email, staff_subject, staff_body)
            emails_queued["staff"] = True
        else:
            email_notes.append("Missing staff/reviewer email; staff email not queued.")

    # -----------------------------
    # Persist changes (IMPORTANT)
    # -----------------------------
    db.commit()
    db.refresh(app)

    return {
        "application_id": app.application_id,
        "previous_status": app.previous_status,
        "current_status": app.current_status,
        "emails_queued": emails_queued,
        "email_notes": email_notes,
    }

def pick_least_loaded_staff_id(db: Session) -> str | None:
    # 1) Compute each staff's load (NO LOCKS here)
    active_counts_sq = (
        select(
            ApplicationForm.reviewer_id.label("rid"),
            func.count(ApplicationForm.application_id).label("cnt"),
        )
        .where(
            ApplicationForm.reviewer_id.isnot(None),
            ApplicationForm.current_status.notin_(EXCLUDED_STATUSES),
        )
        .group_by(ApplicationForm.reviewer_id)
        .subquery()
    )

    staff_loads = db.execute(
        select(
            User.user_id,
            func.coalesce(active_counts_sq.c.cnt, 0).label("load"),
        )
        .select_from(User)
        .outerjoin(active_counts_sq, active_counts_sq.c.rid == User.user_id)
        .where(User.user_role == "STAFF")
        .order_by(func.coalesce(active_counts_sq.c.cnt, 0).asc())
    ).all()

    if not staff_loads:
        return None

    min_load = staff_loads[0].load
    candidates = [row.user_id for row in staff_loads if row.load == min_load]

    if not candidates:
        return None

    # 2) Lock ONE candidate staff row (LOCK QUERY touches ONLY "user" table)
    chosen = db.execute(
        select(User.user_id)
        .where(User.user_id.in_(candidates))
        .order_by(func.random())
        .with_for_update(skip_locked=True)
        .limit(1)
    ).scalar_one_or_none()

    return chosen

@router.put("/needManualReview/{application_id}")
def need_manual_review(
    application_id: str,
    background_tasks: BackgroundTasks,
    data: dict = Body(default={}),
    db: Session = Depends(get_db),
):
    # start a transaction block
    with db.begin():
        # lock the application row so only one request can assign it
        app = (
            db.query(ApplicationForm)
            .filter(ApplicationForm.application_id == application_id)
            .with_for_update()
            .first()
        )

        if not app:
            raise HTTPException(status_code=404, detail="Application not found")

        # Only allow transition from Under Review -> Under Manual Review
        if app.current_status != "Under Review":
            return {
                "application_id": app.application_id,
                "status": app.current_status,
                "reviewer_id": app.reviewer_id,
                "emails_queued": {"user": False, "staff": False},
                "note": f"No status change; current_status is '{app.current_status}'",
            }

        # assign reviewer if empty
        if not app.reviewer_id:
            chosen_staff_id = pick_least_loaded_staff_id(db)
            if not chosen_staff_id:
                raise HTTPException(status_code=409, detail="No STAFF available to assign")

            app.reviewer_id = chosen_staff_id

        app.previous_status = "Under Review"
        app.current_status = "Under Manual Review"
        app.is_open_user = False
        app.is_open_staff = True  # (recommended) since it's now a staff task

        # transaction commits automatically on exiting with db.begin()

    # after commit, fetch staff + user (no locks needed)
    staff = db.query(User).filter(User.user_id == app.reviewer_id).first() if app.reviewer_id else None
    user = db.query(User).filter(User.user_id == app.user_id).first() if app.user_id else None

    def safe_send_email(to_email: str, subject: str, body: str):
        try:
            send_email(to_email, subject, body)
        except Exception as e:
            print(f"❌ Email failed to {to_email}: {e}")

    emails_queued = {"user": False, "staff": False}
    email_notes = []

    if user and user.email:
        user_subject, user_body = build_user_manual_review_email(app, user.first_name)
        background_tasks.add_task(safe_send_email, user.email, user_subject, user_body)
        emails_queued["user"] = True
    else:
        email_notes.append("User email not found; user email not queued.")

    if staff and staff.email:
        staff_subject, staff_body = build_staff_manual_review_email(app, staff.first_name)
        background_tasks.add_task(safe_send_email, staff.email, staff_subject, staff_body)
        emails_queued["staff"] = True
    else:
        email_notes.append("Reviewer/staff email not found; staff email not queued.")

    return {
        "application_id": app.application_id,
        "status": app.current_status,
        "reviewer_id": app.reviewer_id,
        "emails_queued": emails_queued,
        "email_notes": email_notes,
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
def approve_application(
    application_id: str,
    background_tasks: BackgroundTasks,
    data: dict = Body(default={}),
    db: Session = Depends(get_db),
):
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
            raise HTTPException(
                status_code=400,
                detail="reason is required when approving from Under Manual Review",
            )

    # Status update
    app.previous_status = app.current_status
    app.current_status = "Approved"
    app.reason = reason  # may be None
    app.is_open_user = False

    # Persist first
    db.commit()
    db.refresh(app)

    # Resolve user contact details (prefer DB)
    user_email = None
    user_firstName = None

    user = None
    if getattr(app, "user_id", None):
        user = db.query(User).filter(User.user_id == app.user_id).first()

    if user and getattr(user, "email", None):
        user_email = user.email
        user_firstName = getattr(user, "first_name", None)
    else:
        # fallback to request payload if you still send it from frontend
        user_email = data.get("email")
        user_firstName = data.get("firstName")

    def safe_send_email(to_email: str, subject: str, body: str):
        try:
            send_email(to_email, subject, body)
        except Exception as e:
            print(f"❌ Email failed to {to_email}: {e}")

    emails_queued = False
    email_notes = []

    if user_email:
        subject, body = build_approved_email(app, user_firstName)
        background_tasks.add_task(safe_send_email, user_email, subject, body)
        emails_queued = True
    else:
        email_notes.append("User email not found; approval email not queued.")

    return {
        "application_id": app.application_id,
        "status": app.current_status,
        "reason": app.reason,
        "reviewer_id": app.reviewer_id,
        "emails_queued": emails_queued,
        "email_notes": email_notes,
    }
# def approve_application(application_id: str, background_tasks: BackgroundTasks, data: dict = Body(...), db: Session = Depends(get_db)):
#     app = (
#         db.query(ApplicationForm)
#         .filter(ApplicationForm.application_id == application_id)
#         .first()
#     )

#     if not app:
#         raise HTTPException(status_code=404, detail="Application not found")

#     reason = data.get("reason")

#     # Only require reason if approving from Under Manual Review
#     if app.current_status == "Under Manual Review":
#         if reason is None or str(reason).strip() == "":
#             raise HTTPException(status_code=400, detail="reason is required when approving from Under Manual Review")

#     # Status update
#     app.previous_status = app.current_status
#     app.current_status = "Approved"
#     app.reason = reason  # will be None if not provided
#     app.is_open_user = False

#     db.commit()
#     db.refresh(app)

#     user_email = data.get('email')
#     user_firstName = data.get('firstName')

#     subject, body = build_approved_email(app, user_firstName)
#     background_tasks.add_task(send_email, user_email, subject, body)

#     return {
#         "application_id": app.application_id,
#         "status": app.current_status,
#         "reason": app.reason,
#         "reviewer_id": app.reviewer_id
#     }

# Reviewer rejecting the application
@router.put("/reject/{application_id}")
def reject_application(
    application_id: str,
    background_tasks: BackgroundTasks,
    data: dict = Body(default={}),
    db: Session = Depends(get_db),
):
    app = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.application_id == application_id)
        .first()
    )

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    reason = data.get("reason")

    # (Optional but recommended) require reason for rejection
    if reason is None or str(reason).strip() == "":
        raise HTTPException(status_code=400, detail="reason is required when rejecting")

    # Status update
    app.previous_status = app.current_status
    app.current_status = "Rejected"
    app.reason = reason
    app.is_open_user = False

    # Persist first
    db.commit()
    db.refresh(app)

    # Resolve user contact details (prefer DB)
    user_email = None
    user_firstName = None

    user = None
    if getattr(app, "user_id", None):
        user = db.query(User).filter(User.user_id == app.user_id).first()

    if user and getattr(user, "email", None):
        user_email = user.email
        user_firstName = getattr(user, "first_name", None)
    else:
        # fallback to request payload if frontend still sends it
        user_email = data.get("email")
        user_firstName = data.get("firstName")

    def safe_send_email(to_email: str, subject: str, body: str):
        try:
            send_email(to_email, subject, body)
        except Exception as e:
            print(f"❌ Email failed to {to_email}: {e}")

    emails_queued = False
    email_notes = []

    if user_email:
        subject, body = build_rejected_email(app, user_firstName)
        background_tasks.add_task(safe_send_email, user_email, subject, body)
        emails_queued = True
    else:
        email_notes.append("User email not found; rejection email not queued.")

    return {
        "application_id": app.application_id,
        "status": app.current_status,
        "reason": app.reason,
        "reviewer_id": app.reviewer_id,
        "emails_queued": emails_queued,
        "email_notes": email_notes,
    }
# def approve_application(application_id: str, background_tasks: BackgroundTasks, data: dict = Body(...), db: Session = Depends(get_db)):
#     app = (
#         db.query(ApplicationForm)
#         .filter(ApplicationForm.application_id == application_id)
#         .first()
#     )

#     if not app:
#         raise HTTPException(status_code=404, detail="Application not found")

#     reason = data.get("reason")
#     app.previous_status = app.current_status
#     app.current_status = "Rejected"
#     app.reason = reason  # save approval reason

#     db.commit()
#     db.refresh(app)
#     app.is_open_user = False

#     user_email = data.get('email')
#     user_firstName = data.get('firstName')

#     subject, body = build_rejected_email(app, user_firstName)
#     background_tasks.add_task(send_email, user_email, subject, body)
    
#     return {
#         "application_id": app.application_id,
#         "status": app.current_status,
#         "reason": app.reason,
#         "reviewer_id": app.reviewer_id
#     }

# Reviewer escalating the application back to user
@router.put("/escalate/{application_id}")
def require_action(
    application_id: str,
    background_tasks: BackgroundTasks,
    data: dict = Body(default={}),
    db: Session = Depends(get_db),
):
    app = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.application_id == application_id)
        .first()
    )

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    reason = data.get("reason")

    # (Recommended) require reason when setting Requires Action
    if reason is None or str(reason).strip() == "":
        raise HTTPException(status_code=400, detail="reason is required when setting Requires Action")

    if app.has_sent:
        app.has_sent = False
        
    # Status update
    app.previous_status = app.current_status
    app.current_status = "Requires Action"
    app.reason = reason
    app.is_open_user = False

    # Persist first
    db.commit()
    db.refresh(app)

    # Resolve user details (prefer DB)
    user_email = None
    user_firstName = None

    user = None
    if getattr(app, "user_id", None):
        user = db.query(User).filter(User.user_id == app.user_id).first()

    if user and getattr(user, "email", None):
        user_email = user.email
        user_firstName = getattr(user, "first_name", None)
    else:
        user_email = data.get("email")
        user_firstName = data.get("firstName")

    def safe_send_email(to_email: str, subject: str, body: str):
        try:
            send_email(to_email, subject, body)
        except Exception as e:
            print(f"❌ Email failed to {to_email}: {e}")

    emails_queued = False
    email_notes = []

    if user_email:
        subject, body = build_action_required_email(app, user_firstName)
        background_tasks.add_task(safe_send_email, user_email, subject, body)
        emails_queued = True
    else:
        email_notes.append("User email not found; action-required email not queued.")

    return {
        "application_id": app.application_id,
        "status": app.current_status,
        "reason": app.reason,
        "reviewer_id": app.reviewer_id,
        "emails_queued": emails_queued,
        "email_notes": email_notes,
    }
# def approve_application(application_id: str, background_tasks: BackgroundTasks, data: dict = Body(...), db: Session = Depends(get_db)):
#     app = (
#         db.query(ApplicationForm)
#         .filter(ApplicationForm.application_id == application_id)
#         .first()
#     )

#     if not app:
#         raise HTTPException(status_code=404, detail="Application not found")

#     reason = data.get("reason")

#     app.previous_status = app.current_status
#     app.current_status = "Requires Action"
#     app.reason = reason  # save approval reason
#     app.is_open_user = False

#     db.commit()
#     db.refresh(app)

#     user_email = data.get('email')
#     user_firstName = data.get('firstName')

#     subject, body = build_action_required_email(app, user_firstName)
#     background_tasks.add_task(send_email, user_email, subject, body)

#     return {
#         "application_id": app.application_id,
#         "status": app.current_status,
#         "reason": app.reason,
#         "reviewer_id": app.reviewer_id
#     }

# Reviewer escalating the application back to user
@router.put("/withdraw/{application_id}")
def withdraw_application(
    application_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    app = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.application_id == application_id)
        .first()
    )

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Status update
    app.previous_status = app.current_status
    app.current_status = "Withdrawn"
    app.is_open_user = False
    app.is_open_staff = False

    # Persist first
    db.commit()
    db.refresh(app)

    # Fetch applicant details (prefer DB)
    applicant_email = None
    applicant_firstName = None

    applicant = None
    if getattr(app, "user_id", None):
        applicant = db.query(User).filter(User.user_id == app.user_id).first()

    if applicant and getattr(applicant, "email", None):
        applicant_email = applicant.email
        applicant_firstName = getattr(applicant, "first_name", None)

    def safe_send_email(to_email: str, subject: str, body: str):
        try:
            send_email(to_email, subject, body)
        except Exception as e:
            print(f"❌ Email failed to {to_email}: {e}")

    emails_queued = {"user": False}
    email_notes = []

    if applicant_email:
        # If you have a dedicated template, use it:
        # subject, body = build_withdrawn_email(app, applicant_firstName)

        # If you DON'T have one, quick fallback:
        subject = "Your application has been withdrawn"
        body = (
            f"Hi {applicant_firstName or ''},\n\n"
            f"Your application (ID: {app.application_id}) has been marked as Withdrawn.\n"
            "If this was a mistake, please contact support.\n\n"
            "Thanks."
        )

        background_tasks.add_task(safe_send_email, applicant_email, subject, body)
        emails_queued["user"] = True
    else:
        email_notes.append("Applicant email not found; withdrawal email not queued.")

    return {
        "application_id": app.application_id,
        "status": app.current_status,
        "reviewer_id": app.reviewer_id,
        "emails_queued": emails_queued,
        "email_notes": email_notes,
    }
# def approve_application(application_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
#     app = (
#         db.query(ApplicationForm)
#         .filter(ApplicationForm.application_id == application_id)
#         .first()
#     )

#     if not app:
#         raise HTTPException(status_code=404, detail="Application not found")
    
#     app.previous_status = app.current_status
#     app.current_status = "Withdrawn"
#     app.is_open_user = False
#     app.is_open_staff = False

#     user = db.query(User).filter(User.user_id == app.reviewer_id).first()
#     user_email = user.email
#     user_firstName = user.first_name

#     db.commit()
#     db.refresh(app)

#     subject, body = build_rejected_email(app, user_firstName)
#     background_tasks.add_task(send_email, user_email, subject, body)

#     return {
#         "application_id": app.application_id,
#         "status": app.current_status,
#         "reviewer_id": app.reviewer_id
#     }

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

@router.post("/send-draft-reminders")
def send_draft_reminders(db: Session = Depends(get_db),
                         x_job_secret: str | None = Header(default=None),):
    
    if x_job_secret != os.getenv("JOB_SECRET"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    rows = db.execute(text("""
        SELECT application_id, user_id, current_status
        FROM public.application_form
        WHERE current_status IN ('Draft', 'Requires Action')
          AND has_sent = false
          AND last_edited IS NOT NULL
          AND last_edited::date
              < (timezone('Asia/Singapore', now())::date - 2)
    """)).fetchall()

    checked = len(rows)
    sent = 0
    failed = 0
    failures = []
    sent_app_ids = []

    for r in rows:
        application_id = r.application_id
        user_id = r.user_id
        status = r.current_status

        user = db.query(User).filter(User.user_id == user_id).first()
        if not user or not user.email:
            failed += 1
            failures.append({"application_id": application_id, "error": "User email not found"})
            continue

        if status == "Draft":
            subject = "Reminder: Incomplete application"
            body = (
                f"Hi {user.first_name or ''},\n\n"
                f"You have an incomplete application (ID: {application_id}) that hasn’t been updated in the past 2 days.\n"
                "Please log in to complete and submit it when you’re ready.\n\n"
                "Thanks!"
            )
        else:
            subject = "Action required: Please update your application"
            body = (
                f"Hi {user.first_name or ''},\n\n"
                f"Your application (ID: {application_id}) requires further action from you, "
                "but we haven’t received any updates in the past 2 days.\n\n"
                "Please log in to review the requested changes and update your application "
                "so we can continue processing it.\n\n"
                "Thanks!"
            )

        try:
            send_email(user.email, subject, body)
            sent += 1
            sent_app_ids.append(application_id)
        except Exception as e:
            failed += 1
            failures.append({"application_id": application_id, "error": str(e)})

    # Mark reminders as sent (only for ones that succeeded)
    if sent_app_ids:
        db.execute(
            text("""
                UPDATE public.application_form
                SET has_sent = true
                WHERE application_id = ANY(:ids)
            """),
            {"ids": sent_app_ids},
        )
        db.commit()

    return {
        "checked": checked,
        "sent": sent,
        "failed": failed,
        "updated_has_sent": len(sent_app_ids),
        "failures": failures[:20],
    }