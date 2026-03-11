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
from backend.services.audit_service import create_audit_log
from backend.models.user import User
from backend.api.notification import *
from backend.api.resend import send_email
from backend.database import get_db
from backend.models.reviewJobs import ReviewJobs
from backend.models.bellNotifications import BellNotification
from backend.risk.review_service import run_review_job
from backend.services.application_transitions import approve_application_service, need_manual_review_service
from backend.models.action_requests import ActionRequest, ActionRequestItem
from backend.models.auditTrail import AuditTrail
from backend.models.user import User

router = APIRouter(prefix="/applications", tags=["applications"])

JOB_SECRET = os.getenv("JOB_SECRET", "")

EXCLUDED_STATUSES = ("Withdrawn", "Approved", "Rejected")  # not "active"


def to_dict(self):
    return {c.name: getattr(self, c.name) for c in self.__table__.columns}


def add_bell(
    db: Session,
    appId: str,
    recipient_id: str,
    message: str,
    from_status: str | None,
    to_status: str | None,
):
    db.add(BellNotification(
        application_id=appId,
        recipient_id=recipient_id,
        message=message,
        from_status=from_status,
        to_status=to_status,
    ))

def get_users_by_id(db: Session, userID: str):
    user = db.query(User).filter(User.user_id == userID).first()

    return f"{user.first_name} {user.last_name}"

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
    
    form_data = data.get("form_data", {})

    new_app = ApplicationForm(
        business_country=form_data["country"],
        business_name=form_data['businessName'],
        business_type=form_data['businessType'],
        user_id=data["user_id"],
        form_data=form_data,
        previous_status=None,      
        current_status="Draft"
    )

    db.add(new_app)
    db.flush()  # ✅ generates new_app.application_id from server_default

    db.add(BellNotification(
        application_id=new_app.application_id,
        recipient_id=new_app.user_id,
        from_status=new_app.previous_status,
        to_status=new_app.current_status,
        message=f"You have successfuly saved your application as a draft."
    ))

    username = get_users_by_id(db, new_app.user_id)

    # Audit log: application created as draft
    create_audit_log(
        db=db,
        application_id=new_app.application_id,
        actor_id=new_app.user_id,
        actor_type=username,
        event_type="APPLICATION_CREATED",
        entity_type="APPLICATION",
        from_status=None,
        to_status="Draft",
        description="Application created by applicant.",
    )

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
    
    incoming = data or {}
    existing_form_data = app.form_data or {}

    for key, value in incoming.items():
        if key == "application_id":
            continue
        existing_form_data[key] = value

    app.form_data = existing_form_data

    old_previous_status = app.previous_status
    old_current_status = app.current_status
    

    if app.has_sent:
        app.has_sent = False

    if old_current_status == "Draft":
        app.current_status = "Draft"

    elif old_current_status == "Requires Action" and old_previous_status == "Under Manual Review":
        app.previous_status = app.current_status
        app.current_status = "Draft"

    db.add(
        BellNotification(
            application_id=app.application_id,
            recipient_id=app.user_id,
            from_status=old_current_status,
            to_status=app.current_status,
            message="You have successfully saved your application as a draft."
        )
    )

    status_changed = old_current_status != app.current_status

    username = get_users_by_id(db, app.user_id)

    create_audit_log(
        db=db,
        application_id=app.application_id,
        actor_id=app.user_id,
        actor_type=username,
        event_type="APPLICATION_DRAFT_SAVED",
        entity_type="APPLICATION",
        from_status=old_current_status if status_changed else None,
        to_status=app.current_status if status_changed else None,
        description="Applicant updated the application draft."
    )
    
    db.commit()
    db.refresh(app)

    return {
        "application_id": app.application_id,
        "previous_status": app.previous_status,
        "current_status": app.current_status,
    }

@router.post("/firstSubmit")
def first_submit_application(
    background_tasks: BackgroundTasks,
    data: dict = Body(...),
    db: Session = Depends(get_db),
):
    form_data = data.get("form_data", {})


    business_country=form_data["country"],
    business_name=form_data['businessName'],
    business_type=form_data['businessType'],
    user_id = data.get("user_id")

    new_app = ApplicationForm(
        business_country=business_country,
        business_name=business_name,
        business_type=business_type,
        user_id=user_id,
        previous_status=None,
        current_status="Under Review",
        form_data=form_data,
    )

    db.add(new_app)
    db.flush()

    review_job = ReviewJobs(
        application_id=new_app.application_id,
        status="QUEUED"
    )

    db.add(review_job)

    add_bell(
        db=db,
        appId=new_app.application_id,
        recipient_id=new_app.user_id,
        message="Your application has been submitted successfully and is currently under review.",
        from_status=None,
        to_status="Under Review",
    )

    username = get_users_by_id(db, new_app.user_id)

    # Audit 1: application created
    create_audit_log(
        db=db,
        application_id=new_app.application_id,
        actor_id=new_app.user_id,
        actor_type=username,
        event_type="APPLICATION_CREATED",
        entity_type="APPLICATION",
        from_status=None,
        to_status=None,
        description="Application created by applicant."
    )

    create_audit_log(
        db=db,
        application_id=new_app.application_id,
        actor_id=new_app.user_id,
        actor_type=username,
        event_type="APPLICATION_SUBMITTED",
        entity_type="APPLICATION",
        from_status="Draft",
        to_status="Submitted",
        description="Application submitted for bank review."
    )


    # Audit 2: application submitted
    create_audit_log(
        db=db,
        application_id=new_app.application_id,
        actor_id=new_app.user_id,
        actor_type=username,
        event_type="APPLICATION_SUBMITTED",
        entity_type="APPLICATION",
        from_status=None,
        to_status="Under Review",
        description="Application is queued for automated compliance screening."
    )

    print("[firstSubmit] created app", new_app.application_id)

    db.commit()
    db.refresh(new_app)

    print("[firstSubmit] before add_task", new_app.application_id)
    background_tasks.add_task(run_review_job, new_app.application_id)
    print("[firstSubmit] after add_task", new_app.application_id)

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

def close_open_action_request_and_update_answers(db: Session, application_id: str, data: dict):
    ar = (
        db.query(ActionRequest)
        .filter(ActionRequest.application_id == application_id, ActionRequest.status == "OPEN")
        .order_by(desc(ActionRequest.created_at))
        .first()
    )
    if not ar:
        return None

    items = (
        db.query(ActionRequestItem)
        .filter(ActionRequestItem.action_request_id == ar.action_request_id)
        .all()
    )

    now = datetime.now(ZoneInfo("Asia/Singapore")).replace(tzinfo=None)

    # Split requested items
    doc_items = [i for i in items if i.item_type == "DOCUMENT"]
    q_items   = [i for i in items if i.item_type == "QUESTION"]

    # ---------------------------
    # DOCUMENTS: only if requested
    # ---------------------------
    for it in doc_items:
        it.fulfilled = True
        it.fulfilled_at = now

    # ---------------------------
    # QUESTIONS: only if requested
    # ---------------------------
    if q_items:
        answers = data.get("question_answers") or []
        ans_map = {a.get("item_id"): (a.get("answer_text") or "").strip()
                   for a in answers if a.get("item_id")}

        for it in q_items:
            ans = ans_map.get(it.item_id)
            if ans:
                it.answer_text = ans
                it.fulfilled = True
                it.fulfilled_at = now

        missing_qns = [it.item_id for it in q_items if not it.fulfilled]
        if missing_qns:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Not all requested questions are answered.",
                    "missing_question_item_ids": missing_qns,
                },
            )

    # Close only after requirements satisfied
    ar.status = "CLOSED"
    return ar

def apply_full_application_update(app: ApplicationForm, data: dict):
    """
    Used ONLY for first submit case.
    Updates any editable fields + form_data, but blocks status fields from being overwritten by client.
    """
    incoming = data or {}

    # Copy existing JSON safely
    existing_form_data = app.form_data or {}

    for key, value in incoming.items():
        existing_form_data[key] = value

    # Reassign JSON so SQLAlchemy detects the update
    app.form_data = existing_form_data

@router.put("/secondSubmit/{application_id}")
# def second_submit(
#     application_id: str,
#     background_tasks: BackgroundTasks,
#     data: dict = Body(...),
#     db: Session = Depends(get_db),
# ):
#     app = (
#         db.query(ApplicationForm)
#         .filter(ApplicationForm.application_id == application_id)
#         .first()
#     )

#     if not app:
#         raise HTTPException(status_code=404, detail="Application not found")

#     # -----------------------------
#     # Update fields
#     # -----------------------------
#     for key, value in (data or {}).items():
#         if key == "application_id":
#             continue
#         if hasattr(app, key):
#             setattr(app, key, value)
#         else:
#             app.form_data[key] = value

#     curr = app.current_status
#     prev = app.previous_status
#     prev_blank = (prev is None) or (prev == "")

#     user_email = data.get("email")
#     user_firstName = data.get("firstName")

#     # -----------------------------
#     # Resolve staff (if assigned)
#     # -----------------------------
#     staff_email = None
#     staff_firstName = None
#     if app.reviewer_id:
#         staff = db.query(User).filter(User.user_id == app.reviewer_id).first()
#         if staff:
#             staff_email = staff.email
#             staff_firstName = staff.first_name

#     # -----------------------------
#     # Helper: safe background send
#     # -----------------------------
#     def safe_send(to_email: str, subject: str, body: str):
#         try:
#             send_email(to_email, subject, body)
#         except Exception as e:
#             print(f"❌ Email failed to {to_email}: {e}")

#     emails_queued = {"user": False, "staff": False}
#     email_notes = []

#     # -----------------------------
#     # Branch logic
#     # -----------------------------
#     if curr == "Draft" and prev_blank:
#         app.previous_status = app.current_status
#         app.current_status = "Under Review"

#         add_bell(
#             db=db,
#             appId=app.application_id,
#             recipient_id=app.user_id,
#             message="Your application has been submitted successfully and is currently under review.",
#             from_status=app.previous_status,
#             to_status=app.current_status,
#         )

#         if user_email:
#             subject, body = build_application_submitted_email(app, user_firstName)
#             background_tasks.add_task(safe_send, user_email, subject, body)
#             emails_queued["user"] = True
#         else:
#             email_notes.append("Missing user email; user email not queued.")

        

#     elif curr == "Requires Action" and prev == "Under Manual Review":
#         app.previous_status = app.current_status
#         app.current_status = "Under Manual Review"

#         add_bell(
#             db=db,
#             appId=app.application_id,
#             recipient_id=app.user_id,
#             message="We received your additional documents. Your application is back under manual review.",
#             from_status=app.previous_status,
#             to_status=app.current_status,
#         )

#         if app.reviewer_id:
#             add_bell(
#                 db=db,
#                 appId=app.application_id,
#                 recipient_id=app.reviewer_id,
#                 message="Applicant has uploaded additional documents. Please review the application again.",
#                 from_status=app.previous_status,
#                 to_status=app.current_status,
#             )

#         # user email
#         if user_email:
#             user_subject, user_body = build_user_manual_review_email(app, user_firstName)
#             background_tasks.add_task(safe_send, user_email, user_subject, user_body)
#             emails_queued["user"] = True
#         else:
#             email_notes.append("Missing user email; user email not queued.")

#         # staff email
#         if staff_email:
#             staff_subject, staff_body = build_staff_manual_review_email(app, staff_firstName)
#             background_tasks.add_task(safe_send, staff_email, staff_subject, staff_body)
#             emails_queued["staff"] = True
#         else:
#             email_notes.append("Missing staff/reviewer email; staff email not queued.")

#     elif curr == "Draft" and prev == "Requires Action":
#         app.previous_status = app.current_status
#         app.current_status = "Under Manual Review"

#         add_bell(
#             db=db,
#             appId=app.application_id,
#             recipient_id=app.user_id,
#             message="We received your additional documents. Your application is back under manual review.",
#             from_status=app.previous_status,
#             to_status=app.current_status,
#         )

#         if app.reviewer_id:
#             add_bell(
#                 db=db,
#                 appId=app.application_id,
#                 recipient_id=app.reviewer_id,
#                 message="Applicant has uploaded additional documents. Please review the application again.",
#                 from_status=app.previous_status,
#                 to_status=app.current_status,
#             )

#         # user email
#         if user_email:
#             user_subject, user_body = build_user_manual_review_email(app, user_firstName)
#             background_tasks.add_task(safe_send, user_email, user_subject, user_body)
#             emails_queued["user"] = True
#         else:
#             email_notes.append("Missing user email; user email not queued.")

#         # staff email
#         if staff_email:
#             staff_subject, staff_body = build_staff_manual_review_email(app, staff_firstName)
#             background_tasks.add_task(safe_send, staff_email, staff_subject, staff_body)
#             emails_queued["staff"] = True
#         else:
#             email_notes.append("Missing staff/reviewer email; staff email not queued.")

#     # -----------------------------
#     # Persist changes (IMPORTANT)
#     # -----------------------------
#     db.commit()
#     db.refresh(app)

#     return {
#         "application_id": app.application_id,
#         "previous_status": app.previous_status,
#         "current_status": app.current_status,
#         "emails_queued": emails_queued,
#         "email_notes": email_notes,
#     }
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

    curr = app.current_status
    prev = app.previous_status
    prev_blank = (prev is None) or (prev == "")

    user_email = (data or {}).get("email")
    user_firstName = (data or {}).get("firstName")

    # Resolve staff email (if assigned)
    staff_email = None
    staff_firstName = None
    if app.reviewer_id:
        staff = db.query(User).filter(User.user_id == app.reviewer_id).first()
        if staff:
            staff_email = staff.email
            staff_firstName = staff.first_name

    def safe_send(to_email: str, subject: str, body: str):
        try:
            send_email(to_email, subject, body)
        except Exception as e:
            print(f"❌ Email failed to {to_email}: {e}")

    emails_queued = {"user": False, "staff": False}
    email_notes = []

    username = get_users_by_id(db, app.user_id)


    # -----------------------------
    # CASE A: First submit (Draft -> Under Review)
    # user can edit ANY application fields
    # -----------------------------
    if curr == "Draft" and prev_blank:
        apply_full_application_update(app, data)

        app.previous_status = app.current_status
        app.current_status = "Under Review"

        review_job = ReviewJobs(
        application_id=app.application_id,
        status="QUEUED"
    )

        db.add(review_job)

        add_bell(
            db=db,
            appId=app.application_id,
            recipient_id=app.user_id,
            message="Your application has been submitted successfully and is currently under review.",
            from_status=app.previous_status,
            to_status=app.current_status,
        )

        create_audit_log(
            db=db,
            application_id=app.application_id,
            actor_id=app.user_id,
            actor_type=username,
            event_type="APPLICATION_SUBMITTED",
            entity_type="APPLICATION",
            from_status="Draft",
            to_status="Submitted",
            description="Application submitted for bank review."
        )

        # Optional system event for queueing review
        create_audit_log(
            db=db,
            application_id=app.application_id,
            actor_id=None,
            actor_type="SYSTEM",
            event_type="REVIEW_JOB_QUEUED",
            entity_type="REVIEW_JOB",
            from_status=None,
            to_status="Under Review",
            description="Application is queued for automated compliance screening."
        )

         # ✅ ADD THIS (same as firstSubmit)
        print("[secondSubmit] before add_task", app.application_id)
        background_tasks.add_task(run_review_job, app.application_id)
        print("[secondSubmit] after add_task", app.application_id)


        if user_email:
            subject, body = build_application_submitted_email(app, user_firstName)
            background_tasks.add_task(safe_send, user_email, subject, body)
            emails_queued["user"] = True
        else:
            email_notes.append("Missing user email; user email not queued.")

    # -----------------------------
    # CASE B/C: Resubmit after Requires Action
    # user cannot edit application fields; only submit required info (answers etc.)
    # -----------------------------
    elif (curr == "Requires Action" and prev == "Under Manual Review") or (curr == "Draft" and prev == "Requires Action"):
        old_status = app.current_status
        
        # ✅ Close open action request + update answers
        closed_ar = close_open_action_request_and_update_answers(db, app.application_id, data)
        if not closed_ar:
            # your choice: either error out, or allow but log note
            email_notes.append("No OPEN action request found to close for this application.")
        
        # Move app back to manual review
        app.previous_status = app.current_status
        app.current_status = "Under Manual Review"

        add_bell(
            db=db,
            appId=app.application_id,
            recipient_id=app.user_id,
            message="We received your additional information. Your application is back under manual review.",
            from_status=app.previous_status,
            to_status=app.current_status,
        )

        if app.reviewer_id:
            add_bell(
                db=db,
                appId=app.application_id,
                recipient_id=app.reviewer_id,
                message="Applicant has responded to the action request. Please review the application again.",
                from_status=app.previous_status,
                to_status=app.current_status,
            )

        create_audit_log(
            db=db,
            application_id=app.application_id,
            actor_id=app.user_id,
            actor_type=username,
            event_type="APPLICATION_RESUBMITTED",
            entity_type="APPLICATION",
            from_status=old_status,
            to_status="Under Manual Review",
            description="Applicant has submitted the requested additional information.",
        )

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

    else:
        raise HTTPException(
            status_code=400,
            detail=f"secondSubmit not allowed for current_status='{curr}' previous_status='{prev}'"
        )

    db.commit()
    db.refresh(app)

    return {
        "application_id": app.application_id,
        "previous_status": app.previous_status,
        "current_status": app.current_status,
        "emails_queued": emails_queued,
        "email_notes": email_notes,
    }

@router.put("/needManualReview/{application_id}")
def need_manual_review(
    application_id: str,
    background_tasks: BackgroundTasks,
    data: dict = Body(default={}),
    db: Session = Depends(get_db),
):
    app, emails_queued, email_notes = need_manual_review_service(
        db=db,
        background_tasks=background_tasks,
        application_id=application_id,
        send_email_now=False,
    )
    
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


@router.put("/approve/{application_id}")
def approve_application(
    application_id: str,
    background_tasks: BackgroundTasks,
    data: dict = Body(default={}),
    db: Session = Depends(get_db),
):
    reason = data.get("reason")

    app, emails_queued, email_notes = approve_application_service(
        db=db,
        background_tasks=background_tasks,
        application_id=application_id,
        reason=reason,
        email=data.get("email"),
        firstName=data.get("firstName"),
        send_email_now=False,
    )

    return {
        "application_id": app.application_id,
        "status": app.current_status,
        "reason": (app.form_data or {}).get("reason"),
        "reviewer_id": app.reviewer_id,
        "emails_queued": emails_queued,
        "email_notes": email_notes,
    }

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

    old_status = app.current_status

    # Status update
    app.previous_status = app.current_status
    app.current_status = "Rejected"
    app.form_data["reason"] = reason

    db.add(BellNotification(
        application_id=app.application_id,
        recipient_id=app.user_id,
        from_status=app.previous_status,
        to_status="Rejected",
        message="Your application has been rejected."
    ))

    username = get_users_by_id(db, app.reviewer_id)

    create_audit_log(
        db=db,
        application_id=app.application_id,
        actor_id=app.reviewer_id,
        actor_type=f" {username} (Reviewer)",
        event_type="APPLICATION_REJECTED",
        entity_type="APPLICATION",
        from_status=old_status,
        to_status="Rejected",
        description="Application rejected following manual compliance review."
    )

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
        "reason": app.form_data["reason"],
        "reviewer_id": app.reviewer_id,
        "emails_queued": emails_queued,
        "email_notes": email_notes,
    }

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

    requested_docs = data.get("documents") or []
    requested_qns = data.get("questions") or []

    old_status = app.current_status

    if app.has_sent:
        app.has_sent = False
        
    # Status update
    app.previous_status = app.current_status
    app.current_status = "Requires Action"

    # ✅ NEW: Create ActionRequest (one escalation round)
    action_request = ActionRequest(
        application_id=app.application_id,
        reviewer_id=app.reviewer_id,  # better: enforce reviewer_id exists
        reason=reason,
        status="OPEN",
    )
    db.add(action_request)
    db.flush()  # so action_request.action_request_id is available without committing

    # ✅ NEW: Create ActionRequestItems (documents)
    for d in requested_docs:
        item = ActionRequestItem(
            action_request_id=action_request.action_request_id,
            item_type="DOCUMENT",
            document_name=d.get("document_name"),
            document_desc=d.get("document_desc"),
            fulfilled=False,
            fulfilled_at=None,
        )
        db.add(item)

    # ✅ NEW: Create ActionRequestItems (questions)
    for q in requested_qns:
        item = ActionRequestItem(
            action_request_id=action_request.action_request_id,
            item_type="QUESTION",
            question_text=q.get("question_text"),
            fulfilled=False,
            fulfilled_at=None,
        )
        db.add(item)


    db.add(BellNotification(
        application_id=app.application_id,
        recipient_id=app.user_id,
        from_status=app.previous_status,
        to_status=app.current_status ,
        message=f"This application requires additional documents from you. Please upload them."
    ))

    username = get_users_by_id(db, app.reviewer_id)

    create_audit_log(
        db=db,
        application_id=app.application_id,
        actor_id=app.reviewer_id,
        actor_type=f"{username} (Reviewer)",
        event_type="APPLICATION_ESCALATED",
        entity_type="APPLICATION",
        from_status=old_status,
        to_status="Requires Action",
        description="Reviewer requested additional documentation from the applicant."
    )
    
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
        subject, body = build_action_required_email(app, user_firstName, reason, requested_docs, requested_qns)
        background_tasks.add_task(safe_send_email, user_email, subject, body)
        emails_queued = True
    else:
        email_notes.append("User email not found; action-required email not queued.")

    return {
        "application_id": app.application_id,
        "status": app.current_status,
        "reason": reason,
        "reviewer_id": app.reviewer_id,
        "emails_queued": emails_queued,
        "email_notes": email_notes,
    }


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
    
    old_status = app.current_status

    # Status update
    app.previous_status = app.current_status
    app.current_status = "Withdrawn"

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

    reviewer_email = None
    reviewer_firstName = None

    reviewer = None

    if getattr(app, "user_id", None):
        reviewer = db.query(User).filter(User.user_id == app.reviewer_id).first()

    if reviewer and getattr(reviewer, "email", None):
        reviewer_email = reviewer.email
        reviewer_firstName = getattr(reviewer, "first_name", None)

    db.add(BellNotification(
        application_id=app.application_id,
        recipient_id=app.user_id,
        from_status=app.previous_status,
        to_status=app.current_status,
        message=f"You have successfuly withdrawn your application."
    ))

    if reviewer:
        db.add(BellNotification(
            application_id=app.application_id,
            recipient_id=app.reviewer_id,
            from_status=app.previous_status,
            to_status=app.current_status,
            message=f"SME User has withdrawn their application for {app.business_name}."
        ))

    username = get_users_by_id(db, app.user_id)

    create_audit_log(
        db=db,
        application_id=app.application_id,
        actor_id=app.user_id,
        actor_type=username,
        event_type="APPLICATION_WITHDRAWN",
        entity_type="APPLICATION",
        from_status=old_status,
        to_status="Withdrawn",
        description="Application withdrawn by applicant."
    )

    db.commit()

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
        subject = "Your application has been withdrawn successfully"
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

    if reviewer_email:
        subject, body = build_withdrawn_email(app, reviewer_firstName)
        background_tasks.add_task(safe_send_email, reviewer_email, subject, body)
        emails_queued = True
    else:
        email_notes.append("User email not found; action-required email not queued.")

    return {
        "application_id": app.application_id,
        "status": app.current_status,
        "reviewer_id": app.reviewer_id,
        "emails_queued": emails_queued,
        "email_notes": email_notes,
    }

@router.post("/send-draft-reminders")
def send_draft_reminders(db: Session = Depends(get_db),
                         x_job_secret: str | None = Header(default=None),):
    
    if x_job_secret != os.getenv("JOB_SECRET"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    rows = db.execute(text("""
        SELECT application_id, user_id, current_status, previous_status
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

    bell_rows = []


    for r in rows:
        application_id = r.application_id
        user_id = r.user_id
        status = r.current_status
        prev_status = r.previous_status

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
            bell_msg = f"Reminder: Your draft application {application_id} hasn’t been updated in the past 2 days."
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
            bell_msg = f"Reminder: Application {application_id} requires action and hasn’t been updated in the past 2 days."

        try:
            send_email(user.email, subject, body)
            sent += 1
            sent_app_ids.append(application_id)
            
            bell_rows.append(BellNotification(
                application_id=application_id,
                recipient_id=user_id,
                from_status=prev_status,
                to_status=status,
                message=bell_msg,
            ))

        except Exception as e:
            failed += 1
            failures.append({"application_id": application_id, "error": str(e)})
    
    if bell_rows:
        db.add_all(bell_rows)

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

@router.get("/getRequired/{application_id}")
def get_required_requirements(application_id: str, db: Session = Depends(get_db)):
    action_request = (
        db.query(ActionRequest)
        .filter(
            ActionRequest.application_id == application_id,
            ActionRequest.status == "OPEN",
        )
        .order_by(desc(ActionRequest.created_at))
        .first()
    )

    items = (
        db.query(ActionRequestItem)
        .filter(ActionRequestItem.action_request_id == action_request.action_request_id)
        .order_by(desc(ActionRequestItem.item_id))  # you can change ordering if you want
        .all()
    )

    required_documents = []
    required_questions = []

    for it in items:
        # NOTE: since your table doesn't have `required`, we treat all items as required
        if it.item_type == "DOCUMENT":
            required_documents.append(
                {
                    "item_id": it.item_id,
                    "document_name": it.document_name,
                    "document_desc": it.document_desc,
                }
            )
        elif it.item_type == "QUESTION":
            required_questions.append(
                {
                    "item_id": it.item_id,
                    "question_text": it.question_text,
                    "answer_text": it.answer_text,
                }
            )

    return {
        "application_id": application_id,
        "action_request_id": action_request.action_request_id,
        "status": action_request.status,
        "reason": action_request.reason,
        "required_documents": required_documents,
        "required_questions": required_questions,
    }

@router.get("/getActionRequests/{application_id}")
def get_action_requests(application_id: str, db: Session = Depends(get_db)):
    action_requests = (
        db.query(ActionRequest)
        .filter(ActionRequest.application_id == application_id)
        .order_by(desc(ActionRequest.created_at))
        .all()
    )

    results = []

    for ar in action_requests:
        items = (
            db.query(ActionRequestItem)
            .filter(ActionRequestItem.action_request_id == ar.action_request_id)
            .order_by(desc(ActionRequestItem.item_id))
            .all()
        )

        documents = []
        questions = []

        for it in items:
            if it.item_type == "DOCUMENT":
                documents.append(
                    {
                        "item_id": it.item_id,
                        "document_name": it.document_name,
                        "document_desc": it.document_desc,
                        "fulfilled_at": it.fulfilled_at,
                    }
                )

            elif it.item_type == "QUESTION":
                questions.append(
                    {
                        "item_id": it.item_id,
                        "question_text": it.question_text,
                        "answer_text": it.answer_text,
                        "fulfilled_at": it.fulfilled_at,
                    }
                )

        results.append(
            {
                "action_request_id": ar.action_request_id,
                "status": ar.status,
                "reason": ar.reason,
                "created_at": ar.created_at,
                "documents": documents,
                "questions": questions,
            }
        )

    return {
        "application_id": application_id,
        "action_requests": results,
    }