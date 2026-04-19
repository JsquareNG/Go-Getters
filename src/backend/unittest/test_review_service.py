import pytest
from unittest.mock import patch, MagicMock
from types import SimpleNamespace

from backend.compliance_rules_engine.review_service import run_review_job

def make_job(status="PENDING"):
    return SimpleNamespace(
        job_id=1,
        application_id="APP-1",
        status=status,
        risk_score=None,
        risk_grade=None,
        rules_triggered=None,
        completed_at=None,
        last_error=None,
    )


def make_app(form_data=None):
    return SimpleNamespace(
        application_id="APP-1",
        form_data=form_data or {},
        previous_status="PENDING",
        current_status="UNDER_REVIEW",
        cross_validation_result=None,
        document_warning=False,
    )


def setup_db(job, app):
    db = MagicMock()

    review_query = MagicMock()
    app_query = MagicMock()

    db.query.side_effect = [review_query, app_query]

    review_query.filter.return_value.with_for_update.return_value.first.return_value = job
    app_query.filter.return_value.first.return_value = app

    return db


@patch("backend.compliance_rules_engine.review_service.SessionLocal")
def test_job_not_found(mock_session):
    db = MagicMock()
    mock_session.return_value = db

    review_query = MagicMock()
    app_query = MagicMock()
    db.query.side_effect = [review_query, app_query]

    review_query.filter.return_value.with_for_update.return_value.first.return_value = None
    app_query.filter.return_value.first.return_value = None

    run_review_job("APP-1")

    db.close.assert_called_once()


@patch("backend.compliance_rules_engine.review_service.SessionLocal")
def test_already_running(mock_session):
    job = make_job(status="RUNNING")
    app = make_app()

    db = setup_db(job, app)
    mock_session.return_value = db

    run_review_job("APP-1")

    assert job.status == "RUNNING"
    db.close.assert_called_once()


@patch("backend.compliance_rules_engine.review_service.cross_validate_application")
@patch("backend.compliance_rules_engine.review_service.approve_application_service")
@patch("backend.compliance_rules_engine.review_service.submit_application")
@patch("backend.compliance_rules_engine.review_service.create_audit_log")
@patch("backend.compliance_rules_engine.review_service.SessionLocal")
def test_sdd_approve(
    mock_session,
    mock_audit,
    mock_submit,
    mock_approve,
    mock_cross_val,
):
    job = make_job()
    app = make_app({"kycData": {"overallStatus": "Approved"}})

    db = setup_db(job, app)
    mock_session.return_value = db

    mock_cross_val.return_value = {
        "routing_decision": "PASS",
    }

    mock_submit.return_value = {
        "risk_score": 10,
        "risk_decision": "Simplified Due Diligence (SDD)",
        "triggered_rules": [],
    }

    run_review_job("APP-1")

    mock_approve.assert_called_once()
    assert job.status == "COMPLETED"
    assert job.risk_score == 10
    assert job.risk_grade == "Simplified Due Diligence (SDD)"
    assert job.rules_triggered == []
    db.close.assert_called_once()


@patch("backend.compliance_rules_engine.review_service.cross_validate_application")
@patch("backend.compliance_rules_engine.review_service.need_manual_review_service")
@patch("backend.compliance_rules_engine.review_service.submit_application")
@patch("backend.compliance_rules_engine.review_service.create_audit_log")
@patch("backend.compliance_rules_engine.review_service.SessionLocal")
def test_sdd_kyc_declined(
    mock_session,
    mock_audit,
    mock_submit,
    mock_manual,
    mock_cross_val,
):
    job = make_job()
    app = make_app({"kycData": {"overallStatus": "Declined"}})

    db = setup_db(job, app)
    mock_session.return_value = db

    mock_cross_val.return_value = {
        "routing_decision": "PASS",
    }

    mock_submit.return_value = {
        "risk_score": 10,
        "risk_decision": "Simplified Due Diligence (SDD)",
        "triggered_rules": [],
    }

    run_review_job("APP-1")

    mock_manual.assert_called_once()
    assert job.status == "COMPLETED"
    db.close.assert_called_once()


@patch("backend.compliance_rules_engine.review_service.cross_validate_application")
@patch("backend.compliance_rules_engine.review_service.need_manual_review_service")
@patch("backend.compliance_rules_engine.review_service.submit_application")
@patch("backend.compliance_rules_engine.review_service.create_audit_log")
@patch("backend.compliance_rules_engine.review_service.SessionLocal")
@pytest.mark.parametrize(
    "decision",
    [
        "Standard Due Diligence (CDD)",
        "Enhanced Due Diligence (EDD)",
    ],
)
def test_cdd_edd(
    mock_session,
    mock_audit,
    mock_submit,
    mock_manual,
    mock_cross_val,
    decision,
):
    job = make_job()
    app = make_app()

    db = setup_db(job, app)
    mock_session.return_value = db

    mock_cross_val.return_value = {
        "routing_decision": "PASS",
    }

    mock_submit.return_value = {
        "risk_score": 50,
        "risk_decision": decision,
        "triggered_rules": ["rule_1"],
    }

    run_review_job("APP-1")

    mock_manual.assert_called_once()
    assert job.status == "COMPLETED"
    assert job.risk_grade == decision
    db.close.assert_called_once()


@patch("backend.compliance_rules_engine.review_service.cross_validate_application")
@patch("backend.compliance_rules_engine.review_service.auto_reject_application_service")
@patch("backend.compliance_rules_engine.review_service.submit_application")
@patch("backend.compliance_rules_engine.review_service.create_audit_log")
@patch("backend.compliance_rules_engine.review_service.SessionLocal")
def test_auto_reject(
    mock_session,
    mock_audit,
    mock_submit,
    mock_reject,
    mock_cross_val,
):
    job = make_job()
    app = make_app()

    db = setup_db(job, app)
    mock_session.return_value = db

    mock_cross_val.return_value = {
        "routing_decision": "PASS",
    }

    mock_submit.return_value = {
        "risk_score": 90,
        "risk_decision": "REJECT",
        "triggered_rules": ["rule_x"],
    }

    run_review_job("APP-1")

    mock_reject.assert_called_once()
    assert job.status == "COMPLETED"
    assert job.risk_grade == "REJECT"
    db.close.assert_called_once()


@patch("backend.compliance_rules_engine.review_service.cross_validate_application")
@patch("backend.compliance_rules_engine.review_service.submit_application")
@patch("backend.compliance_rules_engine.review_service.SessionLocal")
def test_exception_handling(mock_session, mock_submit, mock_cross_val):
    job = make_job()
    app = make_app()

    db = MagicMock()
    mock_session.return_value = db

    review_query = MagicMock()
    app_query = MagicMock()
    failed_job_query = MagicMock()

    db.query.side_effect = [review_query, app_query, failed_job_query]

    review_query.filter.return_value.with_for_update.return_value.first.return_value = job
    app_query.filter.return_value.first.return_value = app
    failed_job_query.filter.return_value.first.return_value = job

    mock_cross_val.return_value = {
        "routing_decision": "PASS",
    }

    mock_submit.side_effect = Exception("Engine crash")

    run_review_job("APP-1")

    assert job.status == "FAILED"
    assert "Engine crash" in job.last_error
    db.close.assert_called_once()