import os
from fastapi import APIRouter, Depends, Body, HTTPException, BackgroundTasks, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, text

from datetime import datetime
from zoneinfo import ZoneInfo

from backend.auth.dependencies import get_current_user
from backend.database import get_db
from backend.models.application import ApplicationForm
from backend.models.user import User
from backend.models.reviewJobs import ReviewJobs
from backend.models.bellNotifications import BellNotification
from backend.models.action_requests import ActionRequest, ActionRequestItem
from backend.models.liveness_detection import LivenessDetection

from backend.services.audit_service import create_audit_log
from backend.compliance_rules_engine.review_service import run_review_job
from backend.services.application_transitions import (
    approve_application_service,
)
from backend.api.notification import *
from backend.api.resend import send_email

router = APIRouter(prefix="/applications", tags=["applications"])

JOB_SECRET = os.getenv("JOB_SECRET", "")

EXCLUDED_STATUSES = ("Withdrawn", "Approved", "Rejected")

SIMULATION_ELIGIBLE_STATUSES = [
    "Under Manual Review",
    "Requires Action",
    "Approved",
    "Rejected",
    "Withdrawn",
    "Auto Rejected",
]

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
    db.add(
        BellNotification(
            application_id=appId,
            recipient_id=recipient_id,
            message=message,
            from_status=from_status,
            to_status=to_status,
        )
    )


def get_users_by_id(db: Session, userID: str):
    user = db.query(User).filter(User.user_id == userID).first()
    if not user:
        return "Unknown User"
    return f"{user.first_name} {user.last_name}"


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


def _get_application_or_404(db: Session, application_id: str) -> ApplicationForm:
    app = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.application_id == application_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


def _ensure_application_access(app: ApplicationForm, current_user: dict):
    role = _current_user_role(current_user)
    user_id = _current_user_id(current_user)

    if role == "SME":
        if app.user_id != user_id:
            raise HTTPException(status_code=403, detail="Forbidden")
        return

    if role in {"STAFF", "MANAGEMENT"}:
        return

    raise HTTPException(status_code=403, detail="Forbidden")


def _ensure_application_owner(app: ApplicationForm, current_user: dict):
    role = _current_user_role(current_user)
    user_id = _current_user_id(current_user)

    if role != "SME":
        raise HTTPException(status_code=403, detail="Forbidden")

    if app.user_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


def _ensure_staff_or_management(current_user: dict):
    _require_roles(current_user, "STAFF", "MANAGEMENT")

def _safe_send_email(to_email: str, subject: str, body: str):
    try:
        send_email(to_email, subject, body)
    except Exception as e:
        print(f"❌ Email failed to {to_email}: {e}")


def _resolve_user_contact_from_db(db: Session, user_id: str):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return None, None
    return user.email, user.first_name


def _resolve_reviewer_contact_from_db(db: Session, reviewer_id: str | None):
    if not reviewer_id:
        return None, None
    reviewer = db.query(User).filter(User.user_id == reviewer_id).first()
    if not reviewer:
        return None, None
    return reviewer.email, reviewer.first_name

@router.get("/")
def get_all_applications(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_staff_or_management(current_user)

    apps = db.query(ApplicationForm).order_by(ApplicationForm.application_id.desc()).all()
    return [to_dict(a) for a in apps]


@router.get("/byUserID/{user_id}")
def get_application_by_user_id(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = _current_user_role(current_user)
    current_user_id = _current_user_id(current_user)

    if role == "SME" and user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    if role not in {"SME", "STAFF", "MANAGEMENT"}:
        raise HTTPException(status_code=403, detail="Forbidden")

    apps = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.user_id == user_id)
        .order_by(ApplicationForm.application_id.desc())
        .all()
    )

    if not apps:
        raise HTTPException(status_code=404, detail="User not found")

    return [to_dict(a) for a in apps]


@router.get("/byEmployeeID/{reviewer_id}")
def get_application_by_employee_id(
    reviewer_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = str(current_user.get("role", "")).upper().strip()

    if role not in {"STAFF", "MANAGEMENT"}:
        raise HTTPException(status_code=403, detail="Forbidden")

    apps = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.reviewer_id == reviewer_id)
        .order_by(ApplicationForm.application_id.desc())
        .all()
    )

    return [to_dict(a) for a in apps]


@router.get("/byAppID/{application_id}")
def get_application_by_app_id(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    app = _get_application_or_404(db, application_id)
    _ensure_application_access(app, current_user)
    return to_dict(app)


@router.get("/getSimulationApplications")
def get_simulation_applications(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_staff_or_management(current_user)

    rows = (
        db.query(ApplicationForm, ReviewJobs)
        .outerjoin(ReviewJobs, ReviewJobs.application_id == ApplicationForm.application_id)
        .filter(ApplicationForm.current_status.in_(SIMULATION_ELIGIBLE_STATUSES))
        .order_by(ApplicationForm.application_id.desc())
        .all()
    )

    results = []
    for app, review in rows:
        results.append({
            "application_id": app.application_id,
            "business_name": app.business_name,
            "business_country": app.business_country,
            "business_type": app.business_type,
            "current_status": app.current_status,
            "previous_status": app.previous_status,
            "business_industry": app.form_data.get("businessIndustry") if app.form_data else None,
            "reviewer_id": app.reviewer_id,
            "app_last_edited": app.last_edited,
            "form_data": app.form_data,
            "risk_score": review.risk_score if review else None,
            "risk_grade": review.risk_grade if review else None,
            "rules_triggered": review.rules_triggered if review else [],
            "check_completed_at": review.completed_at if review else None,
        })

    return results

@router.post("/firstSave")
def save_application(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_roles(current_user, "SME")

    form_data = data.get("form_data", {})
    provider_session_id = data.get("provider_session_id")

    new_app = ApplicationForm(
        business_country=form_data["country"],
        business_name=form_data['businessName'],
        business_type=form_data['businessType'],
        provider_session_id=provider_session_id,
        user_id=data["user_id"],
        form_data=form_data,
        previous_status=None,
        current_status="Draft",
    )

    db.add(new_app)
    db.flush()

    db.add(
        BellNotification(
            application_id=new_app.application_id,
            recipient_id=new_app.user_id,
            from_status=new_app.previous_status,
            to_status=new_app.current_status,
            message="You have successfuly saved your application as a draft.",
        )
    )

    username = get_users_by_id(db, new_app.user_id)

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


    if provider_session_id:
        liveness_row = (
            db.query(LivenessDetection)
            .filter(LivenessDetection.provider_session_id == provider_session_id)
            .first()
        )

        if liveness_row:
            liveness_row.application_id = new_app.application_id

    db.commit()
    db.refresh(new_app)

    return {
        "application_id": new_app.application_id,
        "status": new_app.current_status,
    }


@router.put("/secondSave/{application_id}")
def second_save(
    application_id: str,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    app = _get_application_or_404(db, application_id)
    _ensure_application_owner(app, current_user)

    incoming = data or {}
    incoming_form_data = incoming.get("form_data", {}) or {}
    existing_form_data = app.form_data or {}

    for key, value in incoming_form_data.items():
        if key == "application_id":
            continue
        existing_form_data[key] = value

    app.form_data = existing_form_data

    old_previous_status = app.previous_status
    old_current_status = app.current_status

    if app.has_sent:
        app.has_sent = False

    if old_current_status == "Requires Action" and old_previous_status == "Under Manual Review":
        app.previous_status = app.current_status
        app.current_status = "Draft"

    db.add(
        BellNotification(
            application_id=app.application_id,
            recipient_id=app.user_id,
            from_status=old_current_status,
            to_status=app.current_status,
            message="You have successfully saved your application as a draft.",
        )
    )

    username = get_users_by_id(db, app.user_id)

    create_audit_log(
        db=db,
        application_id=app.application_id,
        actor_id=app.user_id,
        actor_type=username,
        event_type="APPLICATION_DRAFT_SAVED",
        entity_type="APPLICATION",
        from_status=old_current_status,
        to_status=app.current_status,
        description="Applicant updated the application draft.",
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
    current_user: dict = Depends(get_current_user),
):
    _require_roles(current_user, "SME")

    form_data = data.get("form_data", {})
    provider_session_id = data.get("provider_session_id")
    current_user_id = _current_user_id(current_user)

    business_country = form_data["country"]
    business_name = form_data["businessName"]
    business_type = form_data["businessType"]

    new_app = ApplicationForm(
        business_country=business_country,
        business_name=business_name,
        business_type=business_type,
        user_id=current_user_id,
        previous_status=None,
        current_status="Under Review",
        provider_session_id=provider_session_id,
        form_data=form_data,
    )

    db.add(new_app)
    db.flush()

    review_job = ReviewJobs(
        application_id=new_app.application_id,
        status="QUEUED",
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

    create_audit_log(
        db=db,
        application_id=new_app.application_id,
        actor_id=new_app.user_id,
        actor_type=username,
        event_type="APPLICATION_CREATED",
        entity_type="APPLICATION",
        from_status=None,
        to_status=None,
        description="Application created by applicant.",
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
        description="Application submitted for bank review.",
    )

    create_audit_log(
        db=db,
        application_id=new_app.application_id,
        actor_id=new_app.user_id,
        actor_type=username,
        event_type="APPLICATION_SUBMITTED",
        entity_type="APPLICATION",
        from_status="Submitted",
        to_status="Under Review",
        description="Application is queued for automated compliance screening.",
    )

    if provider_session_id not in (None, ""):
        liveness_row = (
            db.query(LivenessDetection)
            .filter(LivenessDetection.provider_session_id == provider_session_id)
            .first()
        )

        if liveness_row is not None:
            liveness_row.application_id = new_app.application_id
        else:
            print(
                f"[firstSubmit] No LivenessDetection found for provider_session_id={provider_session_id}"
            )

    db.commit()
    db.refresh(new_app)

    background_tasks.add_task(run_review_job, new_app.application_id)

    user_email, user_first_name = _resolve_user_contact_from_db(db, new_app.user_id)

    emails_queued = False
    email_notes = []

    if user_email:
        subject, body = build_application_submitted_email(new_app, user_first_name)
        background_tasks.add_task(_safe_send_email, user_email, subject, body)
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
        .filter(
            ActionRequest.application_id == application_id,
            ActionRequest.status == "OPEN",
        )
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

    ar.ocr_warnings = data.get("ocr_warnings") or False

    doc_items = [i for i in items if i.item_type == "DOCUMENT"]
    alt_docs = data.get("alternative_documents") or []
    alt_map = {
        d.get("item_id"): d
        for d in alt_docs
        if d.get("item_id")
    }

    for it in doc_items:
        alt = alt_map.get(it.item_id)

        if alt:
            it.is_substitute = True
            it.submitted_document_name = (
                alt.get("substitute_document_type") or ""
            ).strip()
            it.substitution_reason = (
                alt.get("substitute_reason") or ""
            ).strip()
        else:
            it.is_substitute = False
            it.submitted_document_name = None
            it.substitution_reason = None

        it.fulfilled_at = now

    q_items = [i for i in items if i.item_type == "QUESTION"]

    if q_items:
        answers = data.get("question_answers") or []
        ans_map = {
            a.get("item_id"): (a.get("answer_text") or "").strip()
            for a in answers
            if a.get("item_id")
        }

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

    ar.status = "CLOSED"
    return ar


def apply_full_application_update(app: ApplicationForm, data: dict):
    incoming = data or {}
    incoming_form_data = incoming.get("form_data", {}) or {}
    existing_form_data = app.form_data or {}

    for key, value in incoming_form_data.items():
        existing_form_data[key] = value

    app.form_data = existing_form_data

@router.put("/secondSubmit/{application_id}")
def second_submit(
    application_id: str,
    background_tasks: BackgroundTasks,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    app = _get_application_or_404(db, application_id)
    _ensure_application_owner(app, current_user)

    curr = app.current_status
    prev = app.previous_status
    prev_blank = (prev is None) or (prev == "")

    staff_email, staff_first_name = _resolve_reviewer_contact_from_db(db, app.reviewer_id)
    user_email, user_first_name = _resolve_user_contact_from_db(db, app.user_id)

    emails_queued = {"user": False, "staff": False}
    email_notes = []

    username = get_users_by_id(db, app.user_id)

    is_initial_submit = curr == "Draft" and prev_blank
    is_cross_validation_resubmit = (
        curr == "Requires Action"
        and prev == "Under Review"
    )

    if is_initial_submit or is_cross_validation_resubmit:
        old_status = app.current_status

        if is_initial_submit:
            apply_full_application_update(app, data)

        app.previous_status = app.current_status
        app.current_status = "Under Review"

        if is_cross_validation_resubmit:
            app.document_warning = False
            app.cross_validation_result = None

        review_job = (
            db.query(ReviewJobs)
            .filter(ReviewJobs.application_id == app.application_id)
            .first()
        )

        if review_job:
            review_job.status = "QUEUED"
            review_job.last_error = None
            review_job.risk_score = None
            review_job.risk_grade = None
            review_job.completed_at = None
        else:
            review_job = ReviewJobs(
                application_id=app.application_id,
                status="QUEUED",
            )
            db.add(review_job)

        add_bell(
            db=db,
            appId=app.application_id,
            recipient_id=app.user_id,
            message="Your application has been submitted successfully and is currently under review."
            if is_initial_submit
            else "We received your corrected document(s). Your application is back under review.",
            from_status=app.previous_status,
            to_status=app.current_status,
        )

        create_audit_log(
            db=db,
            application_id=app.application_id,
            actor_id=app.user_id,
            actor_type=username,
            event_type="APPLICATION_SUBMITTED" if is_initial_submit else "APPLICATION_RESUBMITTED",
            entity_type="APPLICATION",
            from_status=old_status,
            to_status="Under Review",
            description="Application submitted for bank review."
            if is_initial_submit
            else "Applicant reuploaded corrected document(s) after cross-validation mismatch.",
        )

        create_audit_log(
            db=db,
            application_id=app.application_id,
            actor_id=None,
            actor_type="SYSTEM",
            event_type="REVIEW_JOB_QUEUED",
            entity_type="REVIEW_JOB",
            from_status=old_status,
            to_status="Under Review",
            description="Application is queued for automated compliance screening.",
        )

        background_tasks.add_task(run_review_job, app.application_id)

        if user_email:
            subject, body = build_application_submitted_email(app, user_first_name)
            background_tasks.add_task(_safe_send_email, user_email, subject, body)
            emails_queued["user"] = True
        else:
            email_notes.append("Missing user email; user email not queued.")

    elif (curr == "Requires Action" and prev == "Under Manual Review") or (
        curr == "Draft" and prev == "Requires Action"
    ):
        old_status = app.current_status

        closed_ar = close_open_action_request_and_update_answers(db, app.application_id, data)
        if not closed_ar:
            email_notes.append("No OPEN action request found to close for this application.")

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

        if user_email:
            user_subject, user_body = build_user_manual_review_email(app, user_first_name)
            background_tasks.add_task(_safe_send_email, user_email, user_subject, user_body)
            emails_queued["user"] = True
        else:
            email_notes.append("Missing user email; user email not queued.")

        if staff_email:
            staff_subject, staff_body = build_staff_manual_review_email(app, staff_first_name)
            background_tasks.add_task(_safe_send_email, staff_email, staff_subject, staff_body)
            emails_queued["staff"] = True
        else:
            email_notes.append("Missing staff/reviewer email; staff email not queued.")
    else:
        raise HTTPException(
            status_code=400,
            detail=f"secondSubmit not allowed for current_status='{curr}' previous_status='{prev}'",
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

@router.delete("/delete/{application_id}")
def delete_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    app = _get_application_or_404(db, application_id)
    _ensure_application_owner(app, current_user)

    old_status = app.current_status
    app.previous_status = old_status
    app.current_status = "Deleted"

    username = get_users_by_id(db, app.user_id)

    add_bell(
        db=db,
        appId=app.application_id,
        recipient_id=app.user_id,
        message="You have discarded your draft application.",
        from_status=old_status,
        to_status="Deleted",
    )

    create_audit_log(
        db=db,
        application_id=app.application_id,
        actor_id=app.user_id,
        actor_type=username,
        event_type="APPLICATION_DELETED",
        entity_type="APPLICATION",
        from_status=old_status,
        to_status="Deleted",
        description="Applicant discarded the draft application.",
    )

    db.commit()

    return {
        "message": "Application discarded successfully",
        "application_id": application_id,
    }


@router.put("/approve/{application_id}")
def approve_application(
    application_id: str,
    background_tasks: BackgroundTasks,
    data: dict = Body(default={}),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_staff_or_management(current_user)

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

@router.put("/reject/{application_id}")
def reject_application(
    application_id: str,
    background_tasks: BackgroundTasks,
    data: dict = Body(default={}),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_staff_or_management(current_user)

    app = _get_application_or_404(db, application_id)

    reason = data.get("reason")
    if reason is None or str(reason).strip() == "":
        raise HTTPException(status_code=400, detail="reason is required when rejecting")

    old_status = app.current_status
    app.previous_status = app.current_status
    app.current_status = "Rejected"

    form_data = app.form_data or {}
    form_data["reason"] = reason
    app.form_data = form_data

    db.add(
        BellNotification(
            application_id=app.application_id,
            recipient_id=app.user_id,
            from_status=app.previous_status,
            to_status="Rejected",
            message="Your application has been rejected.",
        )
    )

    reviewer_name = get_users_by_id(db, _current_user_id(current_user))

    create_audit_log(
        db=db,
        application_id=app.application_id,
        actor_id=_current_user_id(current_user),
        actor_type=f"{reviewer_name} (Reviewer)",
        event_type="APPLICATION_REJECTED",
        entity_type="APPLICATION",
        from_status=old_status,
        to_status="Rejected",
        description="Application rejected following manual compliance review.",
    )

    db.commit()
    db.refresh(app)

    user_email, user_first_name = _resolve_user_contact_from_db(db, app.user_id)

    emails_queued = False
    email_notes = []

    if user_email:
        subject, body = build_rejected_email(app, user_first_name)
        background_tasks.add_task(_safe_send_email, user_email, subject, body)
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


@router.put("/escalate/{application_id}")
def require_action(
    application_id: str,
    background_tasks: BackgroundTasks,
    data: dict = Body(default={}),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_staff_or_management(current_user)

    app = _get_application_or_404(db, application_id)

    reason = data.get("reason")
    requested_docs = data.get("documents") or []
    requested_qns = data.get("questions") or []

    old_status = app.current_status

    if app.has_sent:
        app.has_sent = False

    app.previous_status = app.current_status
    app.current_status = "Requires Action"

    action_request = ActionRequest(
        application_id=app.application_id,
        reviewer_id=_current_user_id(current_user),
        reason=reason,
        status="OPEN",
    )
    db.add(action_request)
    db.flush()

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

    for q in requested_qns:
        item = ActionRequestItem(
            action_request_id=action_request.action_request_id,
            item_type="QUESTION",
            question_text=q.get("question_text"),
            fulfilled=False,
            fulfilled_at=None,
        )
        db.add(item)

    db.add(
        BellNotification(
            application_id=app.application_id,
            recipient_id=app.user_id,
            from_status=app.previous_status,
            to_status=app.current_status,
            message="This application requires additional documents from you. Please upload them.",
        )
    )

    reviewer_name = get_users_by_id(db, _current_user_id(current_user))

    create_audit_log(
        db=db,
        application_id=app.application_id,
        actor_id=_current_user_id(current_user),
        actor_type=f"{reviewer_name} (Reviewer)",
        event_type="APPLICATION_ESCALATED",
        entity_type="APPLICATION",
        from_status=old_status,
        to_status="Requires Action",
        description="Reviewer requested additional documentation from the applicant.",
    )

    db.commit()
    db.refresh(app)

    user_email, user_first_name = _resolve_user_contact_from_db(db, app.user_id)

    emails_queued = False
    email_notes = []

    if user_email:
        subject, body = build_action_required_email(
            app,
            user_first_name,
            reason,
            requested_docs,
            requested_qns,
        )
        background_tasks.add_task(_safe_send_email, user_email, subject, body)
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


@router.put("/withdraw/{application_id}")
def withdraw_application(
    application_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    app = _get_application_or_404(db, application_id)
    _ensure_application_owner(app, current_user)

    old_status = app.current_status

    app.previous_status = app.current_status
    app.current_status = "Withdrawn"

    open_action_requests = (
        db.query(ActionRequest)
        .filter(
            ActionRequest.application_id == app.application_id,
            ActionRequest.status == "OPEN",
        )
        .all()
    )

    for ar in open_action_requests:
        ar.status = "WITHDRAWN"

    db.commit()
    db.refresh(app)

    applicant_email = None
    applicant_first_name = None

    applicant = None
    if getattr(app, "user_id", None):
        applicant = db.query(User).filter(User.user_id == app.user_id).first()

    if applicant and getattr(applicant, "email", None):
        applicant_email = applicant.email
        applicant_first_name = getattr(applicant, "first_name", None)

    reviewer_email = None
    reviewer_first_name = None

    reviewer = None

    if getattr(app, "reviewer_id", None):
        reviewer = db.query(User).filter(User.user_id == app.reviewer_id).first()

    if reviewer and getattr(reviewer, "email", None):
        reviewer_email = reviewer.email
        reviewer_first_name = getattr(reviewer, "first_name", None)

    db.add(BellNotification(
        application_id=app.application_id,
        recipient_id=app.user_id,
        from_status=app.previous_status,
        to_status=app.current_status,
        message=f"You have successfuly withdrawn your application."
    ))

    if app.reviewer_id:
        db.add(
            BellNotification(
                application_id=app.application_id,
                recipient_id=app.reviewer_id,
                from_status=app.previous_status,
                to_status=app.current_status,
                message=f"SME User has withdrawn their application for {app.business_name}.",
            )
        )

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
        description="Application withdrawn by applicant.",
    )

    db.commit()

    emails_queued = {"user": False, "staff": False}
    email_notes = []

    if applicant_email:
        subject = "Your application has been withdrawn successfully"
        body = (
            f"Hi {applicant_first_name or ''},\n\n"
            f"Your application (ID: {app.application_id}) has been marked as Withdrawn.\n"
            "If this was a mistake, please contact support.\n\n"
            "Thanks."
        )
        background_tasks.add_task(_safe_send_email, applicant_email, subject, body)
        emails_queued["user"] = True
    else:
        email_notes.append("Applicant email not found; withdrawal email not queued.")

    if reviewer_email:
        subject, body = build_withdrawn_email(app, reviewer_first_name)
        background_tasks.add_task(_safe_send_email, reviewer_email, subject, body)
        emails_queued["staff"] = True
    else:
        email_notes.append("Reviewer email not found; reviewer withdrawal email not queued.")

    return {
        "application_id": app.application_id,
        "status": app.current_status,
        "reviewer_id": app.reviewer_id,
        "emails_queued": emails_queued,
        "email_notes": email_notes,
    }

@router.post("/send-draft-reminders")
def send_draft_reminders(
    db: Session = Depends(get_db),
    x_job_secret: str | None = Header(default=None),
):
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
        status_value = r.current_status
        prev_status = r.previous_status

        user = db.query(User).filter(User.user_id == user_id).first()
        if not user or not user.email:
            failed += 1
            failures.append({"application_id": application_id, "error": "User email not found"})
            continue

        if status_value == "Draft":
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

            bell_rows.append(
                BellNotification(
                    application_id=application_id,
                    recipient_id=user_id,
                    from_status=prev_status,
                    to_status=status_value,
                    message=bell_msg,
                )
            )
        except Exception as e:
            failed += 1
            failures.append({"application_id": application_id, "error": str(e)})

    if bell_rows:
        db.add_all(bell_rows)

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
def get_required_requirements(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    app = _get_application_or_404(db, application_id)
    _ensure_application_access(app, current_user)

    action_request = (
        db.query(ActionRequest)
        .filter(
            ActionRequest.application_id == application_id,
            ActionRequest.status == "OPEN",
        )
        .order_by(desc(ActionRequest.created_at))
        .first()
    )

    if not action_request:
        raise HTTPException(status_code=404, detail="No open action request found")

    items = (
        db.query(ActionRequestItem)
        .filter(ActionRequestItem.action_request_id == action_request.action_request_id)
        .order_by(desc(ActionRequestItem.item_id))
        .all()
    )

    required_documents = []
    required_questions = []

    for it in items:
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
def get_action_requests(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    app = _get_application_or_404(db, application_id)
    _ensure_application_access(app, current_user)

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
                        "is_substitute": it.is_substitute,
                        "submitted_document_name": it.submitted_document_name,
                        "substitution_reason": it.substitution_reason,
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
                "ocr_warnings": ar.ocr_warnings
            }
        )

    return {
        "application_id": application_id,
        "action_requests": results,
    }