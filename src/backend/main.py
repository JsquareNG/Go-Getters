from fastapi import FastAPI, BackgroundTasks,HTTPException
from datetime import datetime,timezone,timedelta

from models import User, Application, ApplicationStatus
from database import users, applications
from email_service import send_email
from notification_service import *
from reminder_scheduler import check_and_send_draft_reminders

app = FastAPI(title="SME Onboarding Backend")

@app.post("/register")
def register_user(user: User, background_tasks: BackgroundTasks):
    users[user.user_id] = user

    subject, body = build_account_created_email(user)
    background_tasks.add_task(send_email, user.email, subject, body)

    return {"message": "Account created successfully"}

@app.post("/applications/draft")
def save_draft(application: Application):
    # Always update status + timestamp
    application.status = "DRAFT"
    application.last_updated = datetime.now(timezone.utc)
    

    applications[application.application_id] = application
    user = users.get(application.user_id)

    # ✅ Send immediate informational email
    if not user:
        return {"error": "User not found"}

    # Send informational email
    subject, body = build_draft_saved_email(application)
    send_email(user.email, subject, body)

    return {
        "message": "Draft saved and notification email sent",
        "application_id": application.application_id,
        "last_updated": application.last_updated
    }

@app.post("/check-draft-inactivity")
def trigger_draft_inactivity_check():
    check_and_send_draft_reminders(applications,users)
    return {"message": "Draft inactivity check completed"}

@app.post("/test/rewind-last-updated")
def rewind_last_updated(application_id: int, hours: int):
    app = applications.get(application_id)

    if not app:
        raise HTTPException(
            status_code=404,
            detail=f"Application {application_id} not found"
        )

    app.last_updated -= timedelta(hours=hours)

    return {
        "message": f"Rewound application {application_id} by {hours} hours",
        "new_last_updated": app.last_updated
    }

@app.post("/applications/submit")
def submit_application(app_id: int, background_tasks: BackgroundTasks):
    app = applications[app_id]
    app.status = ApplicationStatus.UNDER_REVIEW
    app.last_updated = datetime.utcnow()

    user = users[app.user_id]

    subject, body = build_application_submitted_email(app, user)
    background_tasks.add_task(send_email, user.email, subject, body)

    return {"message": "Application submitted"}

@app.post("/applications/{app_id}/manual-review")
def manual_review(app_id: int, reviewer_id: int, background_tasks: BackgroundTasks):
    app = applications[app_id]
    app.status = ApplicationStatus.UNDER_MANUAL_REVIEW
    app.reviewer_id = reviewer_id

    user = users[app.user_id]
    staff = users[reviewer_id]

    subject, body = build_staff_manual_review_email(app, staff)
    background_tasks.add_task(send_email, staff.email, subject, body)

    subject, body = build_user_manual_review_email(app, user)
    background_tasks.add_task(send_email, user.email, subject, body)

    return {"message": "Application escalated for manual review"}

@app.post("/applications/{app_id}/approve")
def approve_application(app_id: int, background_tasks: BackgroundTasks):
    app = applications[app_id]
    app.status = ApplicationStatus.APPROVED

    user = users[app.user_id]

    subject, body = build_approved_email(app, user)
    background_tasks.add_task(send_email, user.email, subject, body)

    return {"message": "Application approved"}

@app.post("/applications/{app_id}/reject")
def reject_application(app_id: int, reason: str, background_tasks: BackgroundTasks):
    app = applications[app_id]
    app.status = ApplicationStatus.REJECTED
    app.reason = reason

    user = users[app.user_id]

    subject, body = build_rejected_email(app, user)
    background_tasks.add_task(send_email, user.email, subject, body)

    return {"message": "Application rejected"}

@app.post("/applications/{app_id}/action-required")
def action_required(app_id: int, reason: str, background_tasks: BackgroundTasks):
    app = applications[app_id]
    app.status = ApplicationStatus.REQUIRES_ACTION
    app.reason = reason

    user = users[app.user_id]

    subject, body = build_action_required_email(app, user)
    background_tasks.add_task(send_email, user.email, subject, body)

    return {"message": "User notified for action required"}

@app.get("/check-draft-reminders")
def check_drafts():
    for app in applications.values():
        user = users.get(app.user_id)
        if user:
            check_and_send_draft_reminders(app, user)

    return {"message": "Draft reminders checked"}

