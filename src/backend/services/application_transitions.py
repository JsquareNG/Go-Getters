# backend/services/application_transitions.py
from fastapi import BackgroundTasks, HTTPException
from sqlalchemy.orm import Session

from sqlalchemy import select, func

from backend.models.application import ApplicationForm
from backend.models.bellNotifications import BellNotification
from backend.models.user import User
from backend.api.resend import send_email
from backend.api.notification import *
from backend.services.audit_service import create_audit_log

EXCLUDED_STATUSES = ("Withdrawn", "Approved", "Rejected")  # not "active"


def pick_least_loaded_staff_id(db: Session) -> str:
    staff_ids = db.execute(
        select(User.user_id)
        .where(User.user_role == "STAFF")
        .order_by(User.user_id.asc())
        .with_for_update()
    ).scalars().all()

    if not staff_ids:
        raise ValueError("No STAFF users exist in the system")

    active_counts = dict(
        db.execute(
            select(
                ApplicationForm.reviewer_id,
                func.count(ApplicationForm.application_id)
            )
            .where(
                ApplicationForm.reviewer_id.in_(staff_ids),
                ApplicationForm.current_status.notin_(EXCLUDED_STATUSES),
            )
            .group_by(ApplicationForm.reviewer_id)
        ).all()
    )

    chosen = min(
        staff_ids,
        key=lambda sid: (active_counts.get(sid, 0), sid)
    )

    return chosen

def get_users_by_id(db: Session, userID: str):
    user = db.query(User).filter(User.user_id == userID).first()

    return f"{user.first_name} {user.last_name}"

def approve_application_service(
    db: Session,
    background_tasks: BackgroundTasks,
    application_id: str,
    reason: str | None = None,
    email: str | None = None,
    firstName: str | None = None,
    send_email_now: bool = False,  
):
    app = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.application_id == application_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    old_status = app.current_status
    approval_mode = "MANUAL" if old_status == "Under Manual Review" else "AUTO"

    # Only require reason if approving from Under Manual Review
    if old_status == "Under Manual Review":
        if reason is None or str(reason).strip() == "":
            raise HTTPException(
                status_code=400,
                detail="reason is required when approving from Under Manual Review",
            )

    app.previous_status = old_status
    app.current_status = "Approved"

    if app.form_data is None:
        app.form_data = {}
    app.form_data["reason"] = reason

    db.add(BellNotification(
        application_id=app.application_id,
        recipient_id=app.user_id,
        from_status=app.previous_status,
        to_status="Approved",
        message="Your application has been approved."
    ))

    if app.reviewer_id:
        username = get_users_by_id(db, app.reviewer_id)

    create_audit_log(
        db=db,
        application_id=app.application_id,
        actor_id=app.reviewer_id if approval_mode == "MANUAL" else None,
        actor_type= f"{username} (Reviewer)" if approval_mode == "MANUAL" else "SYSTEM",
        event_type="APPLICATION_APPROVED",
        entity_type="APPLICATION",
        from_status=old_status,
        to_status="Approved",
        description="Application was approved."
    )

    db.commit()
    db.refresh(app)

    # Prefer DB user contact details
    user_email = None
    user_firstName = None

    user = None
    if getattr(app, "user_id", None):
        user = db.query(User).filter(User.user_id == app.user_id).first()

    if user and getattr(user, "email", None):
        user_email = user.email
        user_firstName = getattr(user, "first_name", None)
    else:
        user_email = email
        user_firstName = firstName

    def safe_send_email(to_email: str, subject: str, body: str):
        try:
            send_email(to_email, subject, body)
        except Exception as e:
            print(f"❌ Email failed to {to_email}: {e}")

    emails_queued = False
    email_notes = []

    if user_email:
        subject, body = build_approved_email(app, user_firstName)

        if send_email_now:
            # ✅ worker path: send immediately
            safe_send_email(user_email, subject, body)
            emails_queued = False
            email_notes.append("Approval email sent immediately (worker path).")
        else:
            # ✅ API path: queue via BackgroundTasks
            if background_tasks is not None:
                background_tasks.add_task(safe_send_email, user_email, subject, body)
                emails_queued = True
            else:
                # no background_tasks provided
                emails_queued = False
                email_notes.append("No BackgroundTasks provided; email not queued.")
    else:
        email_notes.append("User email not found; approval email not queued.")

    return app, emails_queued, email_notes


def need_manual_review_service(
    db: Session,
    background_tasks: BackgroundTasks | None,
    application_id: str,
    send_email_now: bool = False,
):
    """
    Moves an application from 'Under Review' -> 'Under Manual Review',
    assigns reviewer if missing, writes bell notifications, and notifies user + staff.
    """

    old_status = None
    old_reviewer_id = None
    reviewer_assigned_now = False

    # start a transaction block
    with db.begin_nested():
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
            return app, {"user": False, "staff": False}, [f"No status change; current_status is '{app.current_status}'"]

        old_status = app.current_status
        old_reviewer_id = app.reviewer_id

        # assign reviewer if empty
        if not app.reviewer_id:
            chosen_staff_id = pick_least_loaded_staff_id(db)
            if not chosen_staff_id:
                raise HTTPException(status_code=409, detail="No STAFF available to assign")
            app.reviewer_id = chosen_staff_id
            reviewer_assigned_now = True

        app.previous_status = "Under Review"
        app.current_status = "Under Manual Review"

        # notifications
        db.add(BellNotification(
            application_id=app.application_id,
            recipient_id=app.user_id,
            from_status=app.previous_status,
            to_status=app.current_status,
            message="Your application is currently under manual review by our bank staff."
        ))

        if app.reviewer_id:
            db.add(BellNotification(
                application_id=app.application_id,
                recipient_id=app.reviewer_id,
                from_status=app.previous_status,
                to_status=app.current_status,
                message="You have an active application due for manual review."
            ))

        # audit: sent to manual review
        create_audit_log(
            db=db,
            application_id=app.application_id,
            actor_id=None,
            actor_type="SYSTEM",
            event_type="APPLICATION_SENT_TO_MANUAL_REVIEW",
            entity_type="APPLICATION",
            from_status=old_status,
            to_status=app.current_status,
            description="Application flagged for manual review."
        )

        # audit: reviewer assigned
        username = get_users_by_id(db, app.reviewer_id)

        if reviewer_assigned_now:
            create_audit_log(
                db=db,
                application_id=app.application_id,
                actor_id=None,
                actor_type="SYSTEM",
                event_type="REVIEWER_ASSIGNED",
                entity_type="APPLICATION",
                from_status=None,
                to_status=None,
                #add reviweer name
                description=f"Application assigned to compliance reviewer {username}."
            )

        db.flush()

    # after commit, fetch staff + user (no locks needed)
    staff = db.query(User).filter(User.user_id == app.reviewer_id).first() if app.reviewer_id else None
    user = db.query(User).filter(User.user_id == app.user_id).first() if app.user_id else None

    def safe_send_email(to_email: str, subject: str, body: str):
        try:
            send_email(to_email, subject, body)
        except Exception as e:
            print(f"❌ Email failed to {to_email}: {e}")

    emails_queued = {"user": False, "staff": False}
    email_notes: list[str] = []

    # user email
    if user and getattr(user, "email", None):
        user_subject, user_body = build_user_manual_review_email(app, getattr(user, "first_name", None))

        if send_email_now:
            safe_send_email(user.email, user_subject, user_body)
            email_notes.append("User manual review email sent immediately (worker path).")
        else:
            if background_tasks is not None:
                background_tasks.add_task(safe_send_email, user.email, user_subject, user_body)
                emails_queued["user"] = True
            else:
                email_notes.append("No BackgroundTasks provided; user email not queued.")
    else:
        email_notes.append("User email not found; user email not queued.")

    # staff email
    if staff and getattr(staff, "email", None):
        staff_subject, staff_body = build_staff_manual_review_email(app, getattr(staff, "first_name", None))

        if send_email_now:
            safe_send_email(staff.email, staff_subject, staff_body)
            email_notes.append("Staff manual review email sent immediately (worker path).")
        else:
            if background_tasks is not None:
                background_tasks.add_task(safe_send_email, staff.email, staff_subject, staff_body)
                emails_queued["staff"] = True
            else:
                email_notes.append("No BackgroundTasks provided; staff email not queued.")
    else:
        email_notes.append("Reviewer/staff email not found; staff email not queued.")

    return app, emails_queued, email_notes


def auto_reject_application_service(
    db: Session,
    background_tasks: BackgroundTasks | None,
    application_id: str,
    send_email_now: bool = False,
):
    app = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.application_id == application_id)
        .with_for_update()
        .first()
    )

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # prevent duplicate / invalid transitions
    if app.current_status in ("Approved", "Rejected", "Auto Rejected", "Withdrawn", "Deleted"):
        return app, False, [f"No status change; current_status is '{app.current_status}'"]

    old_status = app.current_status

    # update statuses
    app.previous_status = old_status
    app.current_status = "Auto Rejected"

    # bell notification to user
    db.add(BellNotification(
        application_id=app.application_id,
        recipient_id=app.user_id,
        from_status=app.previous_status,
        to_status="Auto Rejected",
        message="Your application has been auto rejected after compliance check."
    ))

    # audit log
    create_audit_log(
        db=db,
        application_id=app.application_id,
        actor_id=None,
        actor_type="SYSTEM",
        event_type="APPLICATION_AUTO_REJECTED",
        entity_type="APPLICATION",
        from_status=old_status,
        to_status=app.current_status,
        description="Application auto-rejected due to high risk."
    )

    db.commit()
    db.refresh(app)

    user = None
    if getattr(app, "user_id", None):
        user = db.query(User).filter(User.user_id == app.user_id).first()

    def safe_send_email(to_email: str, subject: str, body: str):
        try:
            send_email(to_email, subject, body)
        except Exception as e:
            print(f"❌ Email failed to {to_email}: {e}")

    emails_queued = False
    email_notes = []

    if user and getattr(user, "email", None):
        # use your own email builder if you already have one
        subject, body = build_auto_rejected_email(app, getattr(user, "first_name", None))

        if send_email_now:
            safe_send_email(user.email, subject, body)
            email_notes.append("Auto rejection email sent immediately (worker path).")
        else:
            if background_tasks is not None:
                background_tasks.add_task(safe_send_email, user.email, subject, body)
                emails_queued = True
            else:
                email_notes.append("No BackgroundTasks provided; email not queued.")
    else:
        email_notes.append("User email not found; auto rejection email not queued.")

    return app, emails_queued, email_notes