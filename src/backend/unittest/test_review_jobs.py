from types import SimpleNamespace
import pytest
from fastapi import HTTPException

import backend.api.reviewJobs as review_jobs_module


# ---------------------------
# Fake DB + Query
# ---------------------------

class FakeQuery:
    def __init__(self, first_result=None, all_result=None):
        self._first_result = first_result
        self._all_result = all_result or []

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def first(self):
        return self._first_result

    def all(self):
        return self._all_result


class FakeDB:
    def __init__(self):
        self._query_map = {}

    def set_query(self, model, *, first=None, all=None):
        self._query_map[model] = FakeQuery(first_result=first, all_result=all)

    def query(self, model):
        return self._query_map.get(model, FakeQuery())


# ---------------------------
# Helper (FIXED VERSION)
# ---------------------------

def make_review_job(
    job_id=1,
    application_id="APP-001",
    status="COMPLETED",
    risk_score=72.5,
    risk_grade="MEDIUM",
    rules_triggered=["RULE_1"],  # default value
    completed_at="2026-03-30T10:00:00Z",
    created_at="2026-03-30T09:00:00Z",
    updated_at="2026-03-30T10:05:00Z",
):
    return SimpleNamespace(
        job_id=job_id,
        application_id=application_id,
        status=status,
        risk_score=risk_score,
        risk_grade=risk_grade,
        rules_triggered=rules_triggered,  # ✅ FIXED
        completed_at=completed_at,
        created_at=created_at,
        updated_at=updated_at,
    )


# ---------------------------
# Tests
# ---------------------------

def test_get_review_by_application_id_returns_review_job():
    db = FakeDB()
    job = make_review_job()
    db.set_query(review_jobs_module.ReviewJobs, first=job)

    result = review_jobs_module.get_review_by_application_id("APP-001", db=db)

    assert result == {
        "job_id": 1,
        "application_id": "APP-001",
        "status": "COMPLETED",
        "risk_score": 72.5,
        "risk_grade": "MEDIUM",
        "rules_triggered": ["RULE_1"],
        "completed_at": "2026-03-30T10:00:00Z",
        "created_at": "2026-03-30T09:00:00Z",
        "updated_at": "2026-03-30T10:05:00Z",
    }


def test_get_review_by_application_id_raises_404_when_missing():
    db = FakeDB()
    db.set_query(review_jobs_module.ReviewJobs, first=None)

    with pytest.raises(HTTPException) as exc:
        review_jobs_module.get_review_by_application_id("APP-404", db=db)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Review job not found for this application"


def test_get_all_review_jobs_returns_all_rows():
    db = FakeDB()
    rows = [
        make_review_job(job_id=2, application_id="APP-002", risk_grade="HIGH", rules_triggered=["RULE_A", "RULE_B"]),
        make_review_job(job_id=1, application_id="APP-001", risk_grade="LOW", rules_triggered=["RULE_X"]),
    ]
    db.set_query(review_jobs_module.ReviewJobs, all=rows)

    result = review_jobs_module.get_all_review_jobs(db=db)

    assert len(result) == 2

    assert result[0]["job_id"] == 2
    assert result[0]["application_id"] == "APP-002"
    assert result[0]["risk_grade"] == "HIGH"
    assert result[0]["rules_triggered"] == ["RULE_A", "RULE_B"]

    assert result[1]["job_id"] == 1
    assert result[1]["application_id"] == "APP-001"
    assert result[1]["risk_grade"] == "LOW"
    assert result[1]["rules_triggered"] == ["RULE_X"]


def test_get_all_review_jobs_returns_empty_list_when_no_rows():
    db = FakeDB()
    db.set_query(review_jobs_module.ReviewJobs, all=[])

    result = review_jobs_module.get_all_review_jobs(db=db)

    assert result == []


def test_get_all_review_jobs_defaults_rules_triggered_to_empty_list():
    db = FakeDB()

    rows = [
        make_review_job(job_id=3, application_id="APP-003", rules_triggered=None),
    ]

    db.set_query(review_jobs_module.ReviewJobs, all=rows)

    result = review_jobs_module.get_all_review_jobs(db=db)

    assert len(result) == 1
    assert result[0]["job_id"] == 3
    assert result[0]["application_id"] == "APP-003"
    assert result[0]["rules_triggered"] == []  # ✅ important behavior


def test_get_review_by_application_id_allows_none_rules_triggered():
    db = FakeDB()

    job = make_review_job(rules_triggered=None)
    db.set_query(review_jobs_module.ReviewJobs, first=job)

    result = review_jobs_module.get_review_by_application_id("APP-001", db=db)

    assert result["job_id"] == 1
    assert result["application_id"] == "APP-001"
    assert result["rules_triggered"] is None  # ✅ important difference