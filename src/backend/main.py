from fastapi import FastAPI, BackgroundTasks, Form
from fastapi.middleware.cors import CORSMiddleware
from models import Application, ApplicationStatus
from email_service import send_email
from reminder_scheduler import schedule_reminder, cancel_reminder

app = FastAPI()

# Enable frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

applications = {}


def build_email(application):
    status = application.status
    app_id = application.app_id

    if status == ApplicationStatus.APPROVED:
        return "Application Approved", f"""
Your application is approved!

Reference ID: {app_id}
Next steps:
http://localhost:8000
"""

    if status == ApplicationStatus.REJECTED:
        return "Application Rejected", f"""
Your application was rejected.

Reason: Incomplete Documentation
Resubmit here:
http://localhost:8000
"""

    if status == ApplicationStatus.UNDER_REVIEW:
        return "Application Under Review", f"""
Your application {app_id} is under system review.
No action required.
"""

    if status == ApplicationStatus.UNDER_MANUAL_REVIEW:
        return "Application Under Manual Review", f"""
Your application {app_id} is under staff review.
No action required.
"""

    if status == ApplicationStatus.REQUIRES_ACTION:
        return "Action Required", f"""
Your application {app_id} requires action.

Upload missing documents now.
"""


@app.post("/application/create")
def create_application(app_id: str = Form(...), email: str = Form(...)):
    app_obj = Application(app_id, email, ApplicationStatus.UNDER_REVIEW)
    applications[app_id] = app_obj

    subject, body = build_email(app_obj)
    send_email(email, subject, body)

    return {"message": "Application created"}


@app.post("/application/update-status")
def update_status(app_id: str = Form(...), status: str = Form(...), background_tasks: BackgroundTasks = None):
    application = applications.get(app_id)

    if not application:
        return {"error": "Application not found"}

    try:
        status_enum = ApplicationStatus(status)
    except:
        return {"error": "Invalid status value"}

    application.status = status_enum

    subject, body = build_email(application)
    background_tasks.add_task(send_email, application.email, subject, body)

    if status_enum == ApplicationStatus.REQUIRES_ACTION:
        schedule_reminder(application)
    else:
        cancel_reminder(app_id)

    return {"message": "Status updated successfully"}

@app.post("/application/upload-documents")
def upload_documents(app_id: str = Form(...)):
    application = applications.get(app_id)

    if not application:
        return {"error": "Application not found"}

    application.missing_docs_uploaded = True
    cancel_reminder(app_id)

    return {"message": "Documents uploaded successfully"}
