from datetime import datetime, timezone

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
        },
        user_id=user_id,
        provider_session_id=None,
    )
    db_session.add(app)
    db_session.commit()
    db_session.refresh(app)
    return app


def seed_review_job(
    db_session,
    application_id,
    status="COMPLETED",
    risk_score=72,
    risk_grade="MEDIUM",
    rules_triggered=None,
):
    job = ReviewJobs(
        application_id=application_id,
        status=status,
        risk_score=risk_score,
        risk_grade=risk_grade,
        rules_triggered=rules_triggered if rules_triggered is not None else ["RULE_1"],
        completed_at=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    return job


def test_get_review_job_by_application_id_success(client, db_session):
    user = seed_user(db_session, email="review1@example.com")
    app = seed_application(db_session, user.user_id)
    seed_review_job(db_session, application_id=app.application_id)

    response = client.get(f"/reviewJobs/getReviewJob/{app.application_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["application_id"] == app.application_id
    assert data["status"] == "COMPLETED"
    assert data["risk_grade"] == "MEDIUM"


def test_get_review_job_by_application_id_not_found(client):
    response = client.get("/reviewJobs/getReviewJob/99999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Review job not found for this application"


def test_get_all_review_jobs(client, db_session):
    user = seed_user(db_session, email="review2@example.com")

    app1 = seed_application(db_session, user.user_id)
    app2 = seed_application(db_session, user.user_id)

    seed_review_job(db_session, application_id=app1.application_id, risk_grade="LOW")
    seed_review_job(db_session, application_id=app2.application_id, risk_grade="HIGH")

    response = client.get("/reviewJobs/")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert {item["application_id"] for item in data} == {app1.application_id, app2.application_id}