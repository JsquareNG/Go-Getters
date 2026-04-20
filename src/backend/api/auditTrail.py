from collections import defaultdict
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.auth.dependencies import get_current_user
from backend.database import get_db
from backend.models.auditTrail import AuditTrail
from backend.models.application import ApplicationForm
from backend.models.user import User

router = APIRouter(prefix="/audit-trail", tags=["audit-trail"])

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


def _ensure_staff_or_management(current_user: dict):
    role = _current_user_role(current_user)
    if role not in {"STAFF", "MANAGEMENT"}:
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
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden",
            )
        return

    if role in {"STAFF", "MANAGEMENT"}:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Forbidden",
    )

@router.get("/getAuditTrails/{application_id}")
def get_audit_trail_by_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    app = _get_application_or_404(db, application_id)
    _ensure_application_access(app, current_user)

    logs = (
        db.query(AuditTrail)
        .filter(AuditTrail.application_id == application_id)
        .order_by(AuditTrail.created_at.asc(), AuditTrail.audit_id.asc())
        .all()
    )

    return [
        {
            "application_id": log.application_id,
            "audit_id": log.audit_id,
            "actor_id": log.actor_id,
            "actor_type": log.actor_type,
            "event_type": log.event_type,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "from_status": log.from_status,
            "to_status": log.to_status,
            "description": log.description,
            "created_at": log.created_at,
        }
        for log in logs
    ]

SUBMISSION_EVENTS = {"application_submitted"}

FINAL_APPROVAL_EVENTS = {"application_approved"}
FINAL_REJECTION_EVENTS = {"application_rejected", "application_declined"}
FINAL_DECISION_EVENTS = FINAL_APPROVAL_EVENTS | FINAL_REJECTION_EVENTS

MANUAL_REVIEW_START_EVENTS = {"application_sent_to_manual_review"}
MANUAL_REVIEW_STATUSES = {"under manual review"}

FINAL_DECISION_STATUSES = {"approved", "rejected", "declined"}


def normalize(value: str | None) -> str:
    if not value:
        return ""
    return str(value).strip().lower()


def is_reviewer_actor(log: AuditTrail) -> bool:
    actor_type = normalize(log.actor_type)
    actor_id = str(log.actor_id).strip() if log.actor_id is not None else ""
    return "(reviewer)" in actor_type and actor_id != ""


def to_days(start: datetime | None, end: datetime | None) -> float | None:
    if not start or not end:
        return None
    diff = (end - start).total_seconds()
    if diff < 0:
        return None
    return diff / 86400


def average(values: list[float]) -> float:
    if not values:
        return 0.0
    return round(sum(values) / len(values), 2)


def get_all_logs_grouped(db: Session):
    logs = (
        db.query(AuditTrail)
        .order_by(
            AuditTrail.application_id.asc(),
            AuditTrail.created_at.asc(),
            AuditTrail.audit_id.asc(),
        )
        .all()
    )

    grouped = defaultdict(list)
    for log in logs:
        grouped[log.application_id].append(log)

    return grouped

@router.get("/metrics/overview")
def get_audit_metrics_overview(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_staff_or_management(current_user)

    grouped_logs = get_all_logs_grouped(db)

    processing_times_days = []
    manual_review_times_days = []
    escalated_applications = 0
    total_applications = len(grouped_logs)

    for application_id, logs in grouped_logs.items():
        submission_time = None
        final_decision_time = None
        manual_review_start = None
        app_escalated = False

        for log in logs:
            event_type = normalize(log.event_type)
            from_status = normalize(log.from_status)
            to_status = normalize(log.to_status)

            if submission_time is None:
                if event_type in SUBMISSION_EVENTS or to_status == "submitted":
                    submission_time = log.created_at

            if event_type in FINAL_DECISION_EVENTS or to_status in FINAL_DECISION_STATUSES:
                final_decision_time = log.created_at

            if manual_review_start is None:
                entered_manual_review = (
                    event_type in MANUAL_REVIEW_START_EVENTS
                    or (
                        to_status in MANUAL_REVIEW_STATUSES
                        and from_status not in MANUAL_REVIEW_STATUSES
                    )
                )
                if entered_manual_review:
                    manual_review_start = log.created_at
                    app_escalated = True

        if submission_time and final_decision_time:
            duration = to_days(submission_time, final_decision_time)
            if duration is not None:
                processing_times_days.append(duration)

        if manual_review_start and final_decision_time and final_decision_time >= manual_review_start:
            duration = to_days(manual_review_start, final_decision_time)
            if duration is not None:
                manual_review_times_days.append(duration)

        if app_escalated:
            escalated_applications += 1

    escalation_rate = round(
        (escalated_applications / total_applications) * 100, 2
    ) if total_applications > 0 else 0.0

    return {
        "totalApplications": total_applications,
        "avgProcessingTimeDays": average(processing_times_days),
        "escalationRate": escalation_rate,
        "avgManualReviewTimeDays": average(manual_review_times_days),
        "totalEscalations": escalated_applications,
    }

@router.get("/metrics/staff-leaderboard")
def get_staff_leaderboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_staff_or_management(current_user)

    grouped_logs = get_all_logs_grouped(db)

    staff_users = db.query(User).filter(User.user_role == "STAFF").all()

    staff_stats = {}
    for user in staff_users:
        staff_id = str(user.user_id)
        full_name = f"{user.first_name} {user.last_name}".strip()

        staff_stats[staff_id] = {
            "staffId": staff_id,
            "staffName": full_name or staff_id,
            "processedApplications": set(),
            "reviewDurationsDays": [],
            "escalationsHandled": 0,
            "approvedCount": 0,
            "decisionCount": 0,
        }

    for application_id, logs in grouped_logs.items():
        app_has_manual_review = False
        app_submission_time = None

        for log in logs:
            event_type = normalize(log.event_type)
            from_status = normalize(log.from_status)
            to_status = normalize(log.to_status)

            if app_submission_time is None:
                if event_type in SUBMISSION_EVENTS or to_status == "submitted":
                    app_submission_time = log.created_at

            entered_manual_review = (
                event_type in MANUAL_REVIEW_START_EVENTS
                or (
                    to_status in MANUAL_REVIEW_STATUSES
                    and from_status not in MANUAL_REVIEW_STATUSES
                )
            )
            if entered_manual_review:
                app_has_manual_review = True

        for log in logs:
            if not is_reviewer_actor(log):
                continue

            actor_id = str(log.actor_id)

            if actor_id not in staff_stats:
                continue

            event_type = normalize(log.event_type)
            to_status = normalize(log.to_status)

            stats = staff_stats[actor_id]
            stats["processedApplications"].add(application_id)

            made_final_decision = (
                event_type in FINAL_DECISION_EVENTS
                or to_status in FINAL_DECISION_STATUSES
            )

            if made_final_decision:
                stats["decisionCount"] += 1

                is_approved = (
                    event_type in FINAL_APPROVAL_EVENTS
                    or to_status == "approved"
                )
                if is_approved:
                    stats["approvedCount"] += 1

                if app_has_manual_review:
                    stats["escalationsHandled"] += 1

                if app_submission_time and log.created_at >= app_submission_time:
                    duration = to_days(app_submission_time, log.created_at)
                    if duration is not None:
                        stats["reviewDurationsDays"].append(duration)

    leaderboard = []
    for staff_id, stats in staff_stats.items():
        processed_count = len(stats["processedApplications"])
        decision_count = stats["decisionCount"]
        approved_count = stats["approvedCount"]

        approval_rate = round(
            (approved_count / decision_count) * 100, 2
        ) if decision_count > 0 else 0.0

        leaderboard.append({
            "staffId": stats["staffId"],
            "staffName": stats["staffName"],
            "processed": processed_count,
            "avgReviewTimeDays": average(stats["reviewDurationsDays"]),
            "approvalRate": approval_rate,
            "escalationsHandled": stats["escalationsHandled"],
        })

    leaderboard.sort(key=lambda x: (-x["processed"], x["staffId"] or ""))

    for index, item in enumerate(leaderboard, start=1):
        item["rank"] = index

    return leaderboard