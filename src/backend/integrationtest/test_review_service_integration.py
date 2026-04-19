import pytest
from datetime import datetime, timezone

from backend.compliance_rules_engine.review_service import run_review_job
from backend.models.user import User
from backend.models.application import ApplicationForm
from backend.models.reviewJobs import ReviewJobs

def seed_user(db_session, email="review@example.com", role="SME"):
    user = User(
        first_name="Jane",
        last_name="Tan",
        email=email,
        password="hashed-password",
        user_role=role,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def seed_application(db_session, user_id):
    app = ApplicationForm(
        business_country="SG",
        business_name="Acme Pte Ltd",
        business_type="PRIVATE_LIMITED",
        previous_status=None,
        current_status="Draft",
        form_data={
            "country": "SG",
            "businessName": "Acme Pte Ltd",
            "businessType": "PRIVATE_LIMITED",
            "businessIndustry": "Technology",
            "individuals": [],
        },
        user_id=user_id,
        provider_session_id=None,
    )
    db_session.add(app)
    db_session.commit()
    db_session.refresh(app)
    return app


def seed_review_job(db_session, application_id):
    job = ReviewJobs(
        application_id=application_id,
        status="PENDING",
        risk_score=None,
        risk_grade=None,
        rules_triggered=None,
        completed_at=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    return job

def test_run_review_job_cdd_flow(db_session, monkeypatch):
    user = seed_user(db_session)
    app = seed_application(db_session, user.user_id)
    app_id = app.application_id
    seed_review_job(db_session, app_id)

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.SessionLocal",
        lambda: db_session
    )

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.submit_application",
        lambda company, db: {
            "risk_score": 30,
            "risk_decision": "Standard Due Diligence (CDD)",
            "triggered_rules": ["RULE_1"]
        }
    )

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.need_manual_review_service",
        lambda **kwargs: None
    )

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.create_audit_log",
        lambda **kwargs: None
    )

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.cross_validate_application",
        lambda db, application_id: {
            "routing_decision": "PASS"
        }
    )

    run_review_job(app_id)

    updated_job = db_session.query(ReviewJobs).filter_by(application_id=app_id).first()

    assert updated_job.status == "COMPLETED"
    assert updated_job.risk_score == 30
    assert updated_job.risk_grade == "Standard Due Diligence (CDD)"
    assert updated_job.rules_triggered == ["RULE_1"]


def test_run_review_job_sdd_approve(db_session, monkeypatch):
    user = seed_user(db_session, email="sdd@example.com")
    app = seed_application(db_session, user.user_id)
    app_id = app.application_id

    app.form_data["kycData"] = {"overallStatus": "Approved"}
    db_session.commit()

    seed_review_job(db_session, app_id)

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.SessionLocal",
        lambda: db_session
    )

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.submit_application",
        lambda company, db: {
            "risk_score": 10,
            "risk_decision": "Simplified Due Diligence (SDD)",
            "triggered_rules": []
        }
    )

    approve_mock = {"called": False}

    def fake_approve(**kwargs):
        approve_mock["called"] = True

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.approve_application_service",
        fake_approve
    )

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.create_audit_log",
        lambda **kwargs: None
    )

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.cross_validate_application",
        lambda db, application_id: {
            "routing_decision": "PASS"
        }
    )

    run_review_job(app_id)

    updated_job = db_session.query(ReviewJobs).filter_by(application_id=app_id).first()

    assert updated_job.status == "COMPLETED"
    assert approve_mock["called"] is True


def test_run_review_job_auto_reject(db_session, monkeypatch):
    user = seed_user(db_session, email="reject@example.com")
    app = seed_application(db_session, user.user_id)
    app_id = app.application_id
    seed_review_job(db_session, app_id)

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.SessionLocal",
        lambda: db_session
    )

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.submit_application",
        lambda company, db: {
            "risk_score": 90,
            "risk_decision": "REJECT",
            "triggered_rules": []
        }
    )

    reject_called = {"called": False}

    def fake_reject(**kwargs):
        reject_called["called"] = True

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.auto_reject_application_service",
        fake_reject
    )

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.create_audit_log",
        lambda **kwargs: None
    )

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.cross_validate_application",
        lambda db, application_id: {
            "routing_decision": "PASS"
        }
    )

    run_review_job(app_id)

    updated_job = db_session.query(ReviewJobs).filter_by(application_id=app_id).first()

    assert updated_job.status == "COMPLETED"
    assert reject_called["called"] is True

def test_run_review_job_exception(db_session, monkeypatch):
    user = seed_user(db_session, email="error@example.com")
    app = seed_application(db_session, user.user_id)
    app_id = app.application_id
    seed_review_job(db_session, app_id)

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.SessionLocal",
        lambda: db_session
    )

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.submit_application",
        lambda *args, **kwargs: (_ for _ in ()).throw(Exception("Engine crash"))
    )

    monkeypatch.setattr(
        "backend.compliance_rules_engine.review_service.cross_validate_application",
        lambda db, application_id: {
            "routing_decision": "PASS"
        }
    )

    run_review_job(app_id)

    updated_job = db_session.query(ReviewJobs).filter_by(application_id=app_id).first()

    assert updated_job.status == "FAILED"
    assert "Engine crash" in updated_job.last_error