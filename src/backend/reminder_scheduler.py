from datetime import datetime, timedelta, timezone
from email_service import send_email
from notification_service import build_draft_reminder_email

def check_and_send_draft_reminder(app, user):
    if app.status == "DRAFT":
        now_utc = datetime.now(timezone.utc)

        # Ensure last_updated is also timezone-aware
        if app.last_updated.tzinfo is None:
            app.last_updated = app.last_updated.replace(tzinfo=timezone.utc)

        if now_utc - app.last_updated >= timedelta(minutes=1):
            subject, body = build_draft_reminder_email(app, user)
            send_email(user.email, subject, body)
