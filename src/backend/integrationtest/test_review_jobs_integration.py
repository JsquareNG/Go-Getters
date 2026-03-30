from datetime import datetime

from backend.models.reviewJobs import ReviewJobs


def seed_review_job(
    db_session,
    application_id="APP-1",
    status="COMPLETED",
    risk_score=72.5,
    risk_grade="MEDIUM",
    rules_triggered=None,
):
    job = ReviewJobs(
        application_id=application_id,
        status=status,
        risk_score=risk_score,
        risk_grade=risk_grade,
        rules_triggered=rules_triggered if rules_triggered is not None else ["RULE_1"],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    return job


def test_get_review_job_by_application_id_success(client, db_session):
    seed_review_job(db_session, application_id="APP-1")

    response = client.get("/reviewJobs/getReviewJob/APP-1")

    assert response.status_code == 200
    data = response.json()
    assert data["application_id"] == "APP-1"
    assert data["status"] == "COMPLETED"
    assert data["risk_grade"] == "MEDIUM"


def test_get_review_job_by_application_id_not_found(client):
    response = client.get("/reviewJobs/getReviewJob/APP-404")

    assert response.status_code == 404
    assert response.json()["detail"] == "Review job not found for this application"


def test_get_all_review_jobs(client, db_session):
    seed_review_job(db_session, application_id="APP-1", risk_grade="LOW")
    seed_review_job(db_session, application_id="APP-2", risk_grade="HIGH")

    response = client.get("/reviewJobs/")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert {item["application_id"] for item in data} == {"APP-1", "APP-2"}