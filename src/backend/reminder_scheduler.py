from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from email_service import send_email

scheduler = BackgroundScheduler()
scheduler.start()

pending_reminders = {}

def schedule_reminder(application):
    deadline = datetime.utcnow() + timedelta(seconds=15)
    pending_reminders[application.app_id] = deadline

    scheduler.add_job(
        send_reminder,
        "date",
        run_date=deadline,
        args=[application.app_id],
        id=application.app_id,
        replace_existing=True
    )


def cancel_reminder(app_id):
    try:
        scheduler.remove_job(app_id)
    except:
        pass


def send_reminder(app_id):
    from main import applications

    app = applications.get(app_id)

    if not app:
        return

    if app.status != "Requires Action":
        return

    if app.missing_docs_uploaded:
        return

    send_email(
        app.email,
        "Reminder: Action Required on Your Application",
        f"""
Your SME application ({app.app_id}) still requires action.

Please upload your missing documents:
http://localhost:8000
"""
    )
