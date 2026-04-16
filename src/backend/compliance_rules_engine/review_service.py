from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models.reviewJobs import ReviewJobs
from sqlalchemy import text
from backend.config.settings import RISK_APPETITE_SCORE_THRESHOLD
from backend.services.application_transitions import approve_application_service, need_manual_review_service, auto_reject_application_service
from backend.compliance_rules_engine.application_service import submit_application
from backend.compliance_rules_engine.models import Company, Individual
from datetime import datetime
from backend.services.audit_service import create_audit_log
from backend.models.application import ApplicationForm
from backend.services.cross_validation.orchestrator import cross_validate_application
import traceback 

def run_review_job(application_id: str):
    print("[run_review_job] START", application_id)
    db: Session = SessionLocal()

    try:
        job = (
            db.query(ReviewJobs)
            .filter(ReviewJobs.application_id == application_id)
            .with_for_update()
            .first()
        )

        app = db.query(ApplicationForm).filter(
            ApplicationForm.application_id == application_id
        ).first()

        if not job or not app:
            return
        
        if job.status in ["RUNNING", "COMPLETED"]:
            return

        # 🔄 Mark job as running
        job.status = "RUNNING"

        create_audit_log(
            db=db,
            application_id=application_id,
            actor_id=None,
            actor_type="System",
            event_type="REVIEW_JOB_STARTED",
            entity_type="REVIEW_JOB",
            entity_id=job.job_id,
            from_status=app.previous_status,
            to_status=app.current_status,
            description="System initiated automated compliance screening",
        )

        db.commit()

        cross_validation_result = cross_validate_application(
            db=db,
            application_id=application_id,
        )

        routing_decision = cross_validation_result.get("routing_decision")

        if routing_decision == "SEND_BACK_TO_USER":
            app.cross_validation_result = cross_validation_result
            app.document_warning = True
            
            old_previous_status = app.previous_status
            old_current_status = app.current_status

            job.status = "COMPLETED"
            job.completed_at = text("(now() AT TIME ZONE 'Asia/Singapore')")
            job.last_error = None

            app.previous_status = "Under Review"
            app.current_status = "Requires Action"

            create_audit_log(
                db=db,
                application_id=application_id,
                actor_id=None,
                actor_type="System",
                event_type="CROSS_VALIDATION_COMPLETED",
                entity_type="APPLICATION",
                entity_id=application_id,
                from_status=old_current_status,
                to_status="Requires Action",
                description="Cross-validation found critical mismatch(es). Application sent back to user for action.",
            )

            db.commit()
            return

        if routing_decision == "SEND_TO_RULES_ENGINE_AND_MANUAL_REVIEW_AFTER":
            app.cross_validation_result = cross_validation_result

        form = app.form_data or {}
        kyc_data = form.get("kycData", {}) or {}
        kyc_overall_status = kyc_data.get("overallStatus")

        individuals = []

        people = form.get("individuals", [])
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
                    is_pep=(p.get("pepDeclaration") == "Yes"),
                    sanctions_declared=(p.get("sanctionsDeclaration") == "Yes"),
                    fatca_us_person=(p.get("fatcaDeclaration") == "Yes"),
                )
            )

        expected_volume_raw = form.get("expectedMonthlyTransactionVolume", 0)
        try:
            expected_volume = float(expected_volume_raw)
        except (TypeError, ValueError):
            expected_volume = 0

        registration_date_str = form.get("registrationDate")
        expected_countries = form.get("expectedCountriesOfTransactionActivity", [])

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
            industry=form.get("businessIndustry",""),
            entity_type=form.get("businessType"),

            years_incorporated=years_incorporated,
            annual_revenue=form.get("annualRevenue"),
            expected_tx_volume=expected_volume,

            ownership_layers=form.get("ownership_layers", 1),
            transaction_country_count = len(expected_countries),

            individuals=individuals,
            director_count=len(individuals),
        )

        result = submit_application(company, db)

        decision = result.get("risk_decision")

        job.risk_score = result.get("risk_score")
        job.risk_grade = decision
        job.rules_triggered = result.get("triggered_rules", [])


        if decision == "Simplified Due Diligence (SDD)":
            create_audit_log(
                db=db,
                application_id=application_id,
                actor_id=None,
                actor_type="SYSTEM",
                event_type="REVIEW_JOB_COMPLETED",
                entity_type="REVIEW_JOB",
                entity_id=job.job_id,
                from_status=None,
                to_status=None,
                description="Automated review process completed."
            )

            if routing_decision == "SEND_TO_RULES_ENGINE_AND_MANUAL_REVIEW_AFTER":
                create_audit_log(
                    db=db,
                    application_id=application_id,
                    actor_id=None,
                    actor_type="SYSTEM",
                    event_type="REVIEW_JOB_COMPLETED",
                    entity_type="REVIEW_JOB",
                    entity_id=job.job_id,
                    from_status=None,
                    to_status=None,
                    description="SDD but requires manual review due to OCR mismatch in documents"
                )

                need_manual_review_service(
                    db=db,
                    background_tasks=None,
                    application_id=application_id,
                    send_email_now=True,
                )
            elif kyc_overall_status == "Declined":
                create_audit_log(
                    db=db,
                    application_id=application_id,
                    actor_id=None,
                    actor_type="SYSTEM",
                    event_type="REVIEW_JOB_COMPLETED",
                    entity_type="REVIEW_JOB",
                    entity_id=job.job_id,
                    from_status=None,
                    to_status=None,
                    description="SDD but KYC Declined → routed to manual review",
                )

                need_manual_review_service(
                    db=db,
                    background_tasks=None,
                    application_id=application_id,
                    send_email_now=True,
                )
            else:
                approve_application_service(
                    db=db,
                    background_tasks=None,
                    application_id=application_id,
                    reason="Auto-approved by rules engine",
                    send_email_now=True,
                )
        elif decision == 'Standard Due Diligence (CDD)' or decision == 'Enhanced Due Diligence (EDD)':
            create_audit_log(
                db=db,
                application_id=application_id,
                actor_id=None,
                actor_type="SYSTEM",
                event_type="REVIEW_JOB_COMPLETED",
                entity_type="REVIEW_JOB",
                entity_id=job.job_id,
                from_status=None,
                to_status=None,
                description="Automated review process completed."
            )

            need_manual_review_service(
                db=db,
                background_tasks=None,
                application_id=application_id,
                send_email_now=True,
            )
        else:
            create_audit_log(
                db=db,
                application_id=application_id,
                actor_id=None,
                actor_type="SYSTEM",
                event_type="REVIEW_JOB_COMPLETED",
                entity_type="REVIEW_JOB",
                entity_id=job.job_id,
                from_status=None,
                to_status=None,
                description="Automated review process completed."
            )
            auto_reject_application_service(
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

        print("\n🔥 ERROR IN run_review_job 🔥")
        traceback.print_exc()   # ✅ THIS IS THE KEY LINE
        print("Error message:", str(e))

        failed_job = db.query(ReviewJobs).filter(
            ReviewJobs.application_id == application_id
        ).first()

        if failed_job:
            failed_job.status = "FAILED"
            failed_job.last_error = str(e)
            db.commit()

    finally:
        db.close()