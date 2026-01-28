from datetime import datetime, timedelta, timezone
from email_service import send_email
from config import DRAFT_REMINDER_THRESHOLD
from notification_service import build_draft_reminder_email

def check_and_send_draft_reminders(applications: dict, users: dict):
    now = datetime.now(timezone.utc)

    for app in applications.values():
        if app.status == "DRAFT":
            inactivity = now - app.last_updated

            if inactivity >= DRAFT_REMINDER_THRESHOLD:
                user = users.get(app.user_id)

                if not user:
                    continue  # safety guard

                send_email(
                    user.email,
                    "Reminder: Complete Your Application",
                    f"""
Hi {user.first_name},

Your application for {app.business_name}
(Application ID: {app.application_id})
has been inactive for over 48 hours.

Please complete and submit your application.
"""
                )