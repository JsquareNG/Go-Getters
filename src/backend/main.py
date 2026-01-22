from fastapi import FastAPI, BackgroundTasks
from datetime import datetime

from models import User, Application, ApplicationStatus
from database import users, applications
from email_service import send_email
from notification_service import *
from reminder_scheduler import check_and_send_draft_reminder

app = FastAPI(title="SME Onboarding Backend")

@app.post("/register")
def register_user(user: User, background_tasks: BackgroundTasks):
    users[user.user_id] = user

    subject, body = build_account_created_email(user)
    background_tasks.add_task(send_email, user.email, subject, body)

    return {"message": "Account created successfully"}

@app.post("/applications/draft")
def save_draft(app_data: Application):
    app_data.status = ApplicationStatus.DRAFT
    app_data.last_updated = datetime.utcnow()

    applications[app_data.application_id] = app_data

    return {"message": "Draft saved successfully"}

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
            check_and_send_draft_reminder(app, user)

    return {"message": "Draft reminders checked"}

