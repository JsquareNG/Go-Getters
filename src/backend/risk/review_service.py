from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models.application import ApplicationForm
from backend.models.reviewJobs import ReviewJobs
from backend.risk.rules_engine import build_default_engine
from sqlalchemy import text
from backend.config.settings import RISK_APPETITE_SCORE_THRESHOLD
from backend.services.application_transitions import approve_application_service, need_manual_review_service
from backend.rules_engine.application_service import submit_application
from backend.rules_engine.models import Company, Individual


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

        form = app.form_data or {}

        individuals = []

        people = form.get("individuals", [])

        for p in people:
            individuals.append(
                Individual(
                    name=p.get("fullName"),
                    nationality=p.get("nationality"),
                    ownership_pct=p.get("ownership_pct", 0),
                    is_pep=p.get("is_pep", False),
                    sanctions_match=p.get("sanctions_match", False),
                )
            )

        company = Company(
            name=form.get("businessName"),
            country=form.get("country"),
            industry=form.get("industry"),
            ownership_layers=form.get("ownership_layers", 1),
            uses_trust_or_nominee=form.get("uses_trust_or_nominee", False),
            expected_monthly_volume=form.get("expectedMonthlyTransactionVolume", 0),
            individuals=individuals,
        )

        result = submit_application(company)

        job.risk_score = result.get("risk_score")
        job.risk_grade = result.get("decision")
        job.rules_triggered = result.get("triggered_checks", [])


        decision = result.get("decision")

        if decision == "Simplified CDD":
            approve_application_service(
                db=db,
                background_tasks=None,
                application_id=application_id,
                reason="Auto-approved by rules engine",
                send_email_now=True,
            )
        else:
            need_manual_review_service(
                db=db,
                background_tasks=None,
                application_id=application_id,
                send_email_now=True,
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