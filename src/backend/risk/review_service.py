from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models.application import ApplicationForm
from backend.models.reviewJobs import ReviewJobs
from backend.risk.rules_engine import build_default_engine
from sqlalchemy import text
from backend.config.settings import RISK_APPETITE_SCORE_THRESHOLD
from backend.services.application_transitions import approve_application_service, need_manual_review_service

def run_review_job(application_id: str):
    print("[run_review_job] START", application_id)
    db: Session = SessionLocal()

    try:
        job = db.query(ReviewJobs).filter(
            ReviewJobs.application_id == application_id
        ).first()

        app = db.query(ApplicationForm).filter(
            ApplicationForm.application_id == application_id
        ).first()

        if not job or not app:
            return

        # 🔄 Mark job as running
        job.status = "RUNNING"
        db.commit()

        engine = build_default_engine()

        ctx = {
            "business_country": app.business_country,
            "business_type": app.business_type,
            "business_name": app.business_name,
            "form_data": app.form_data or {},
        }

        result = engine.run(ctx)

        # ✅ Store scoring results
        job.risk_score = result.score
        job.risk_grade = result.grade
        job.rules_triggered = result.triggered

        # ✅ Risk appetite decision layer
        if result.score < RISK_APPETITE_SCORE_THRESHOLD:
            approve_application_service(
                db=db,
                background_tasks=None,          # worker has no response lifecycle
                application_id=application_id,
                reason="Auto-approved by rules engine",
                send_email_now=True,            # ✅ send immediately (or set False to skip)
            )
        else:
            need_manual_review_service(
                db=db,
                background_tasks=None,
                application_id=application_id,
                send_email_now=True,   # worker path
            )

        job.status = "COMPLETED"
        job.completed_at = text("(now() AT TIME ZONE 'Asia/Singapore')")

        db.commit()

    except Exception as e:
        db.rollback()

        failed_job = db.query(ReviewJobs).filter(
            ReviewJobs.application_id == application_id
        ).first()

        if failed_job:
            failed_job.status = "FAILED"
            failed_job.last_error = str(e)
            db.commit()

    finally:
        db.close()