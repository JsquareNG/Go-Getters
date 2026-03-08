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
from datetime import datetime


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
        pepDeclaration = form.get("pepDeclaration")  == "Yes"
        sanctionsDeclaration = form.get("sanctionsDeclaration") == "Yes"


        if isinstance(people, dict):
            people = [people]
        elif people is None:
            people = []
        elif not isinstance(people, list):
            raise ValueError(f"form['individuals'] must be a list or dict, got {type(people).__name__}")

        for p in people:
            individuals.append(
                Individual(
                    name=p.get("fullName"),
                    nationality=p.get("nationality"),
                    ownership_pct=p.get("ownership", 0),
                    is_pep=pepDeclaration,
                    sanctions_match=sanctionsDeclaration,
                    is_signatory=p.get("is_signatory",False),
                    directorships=p.get("directorships", 1)
                )
            )

        expected_volume_raw = form.get("expectedMonthlyTransactionVolume", 0)
        try:
            expected_volume = float(expected_volume_raw)
        except (TypeError, ValueError):
            expected_volume = 0

        registration_date_str = form.get("registrationDate")

        years_incorporated = 1  # default fallback

        if registration_date_str:
            try:
                registration_date = datetime.strptime(registration_date_str, "%Y-%m-%d")
                today = datetime.today()

                years_incorporated = today.year - registration_date.year

                # adjust if anniversary hasn't passed this year
                if (today.month, today.day) < (registration_date.month, registration_date.day):
                    years_incorporated -= 1

                if years_incorporated < 0:
                    years_incorporated = 0

            except Exception:
                years_incorporated = 1

        company = Company(
            name=form.get("businessName"),
            country=form.get("country"),
            industry=form.get("businessIndustry"),
            ownership_layers=form.get("ownership_layers", 1),
            trust_structure=form.get("uses_trust_or_nominee", False),
            expected_volume=expected_volume,
            years_incorporated=years_incorporated,
            physical_presence=form.get("physical_presence", False),
            cross_border=form.get("cross_border", False),
            individuals=individuals,
        )

        result = submit_application(company)

        job.risk_score = result.get("risk_score")
        job.risk_grade = result.get("decision")
        job.rules_triggered = result.get("rules_triggered", [])


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