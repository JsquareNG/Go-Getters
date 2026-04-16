from datetime import datetime, timedelta
from types import SimpleNamespace

import backend.api.auditTrail as audit_module


# ----------------------------
# Fakes
# ----------------------------

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

    def set_query(self, model_or_tuple, *, first=None, all=None):
        self._query_map[model_or_tuple] = FakeQuery(first_result=first, all_result=all)

    def set_logs(self, logs):
        self.set_query(audit_module.AuditTrail, all=logs)

    def query(self, *models):
        key = models[0] if len(models) == 1 else models
        if key not in self._query_map:
            return FakeQuery()
        return self._query_map[key]


def make_app(application_id="APP-1", user_id="USER-1"):
    return SimpleNamespace(
        application_id=application_id,
        user_id=user_id,
    )


def make_user(user_id="00000001", first_name="Test", last_name="User", user_role="STAFF"):
    return SimpleNamespace(
        user_id=user_id,
        first_name=first_name,
        last_name=last_name,
        user_role=user_role,
    )


def make_log(
    application_id="APP-1",
    audit_id=1,
    actor_id="USER-1",
    actor_type="Applicant",
    event_type="APPLICATION_SUBMITTED",
    entity_type="APPLICATION",
    entity_id=None,
    from_status=None,
    to_status=None,
    description="desc",
    created_at=None,
):
    return SimpleNamespace(
        application_id=application_id,
        audit_id=audit_id,
        actor_id=actor_id,
        actor_type=actor_type,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        from_status=from_status,
        to_status=to_status,
        description=description,
        created_at=created_at or datetime(2026, 1, 1, 10, 0, 0),
    )


SME_USER = {"user_id": "USER-1", "role": "SME"}
STAFF_USER = {"user_id": "STAFF-1", "role": "STAFF"}
MGMT_USER = {"user_id": "MGMT-1", "role": "MANAGEMENT"}


# ----------------------------
# Helper function tests
# ----------------------------

def test_normalize_handles_none_and_whitespace():
    assert audit_module.normalize(None) == ""
    assert audit_module.normalize("") == ""
    assert audit_module.normalize("  Under Review  ") == "under review"


def test_is_reviewer_actor_true_when_actor_type_contains_reviewer_and_has_id():
    log = make_log(actor_id="R1", actor_type="Alice (Reviewer)")
    assert audit_module.is_reviewer_actor(log) is True


def test_is_reviewer_actor_false_when_missing_reviewer_marker():
    log = make_log(actor_id="R1", actor_type="Alice")
    assert audit_module.is_reviewer_actor(log) is False


def test_is_reviewer_actor_false_when_actor_id_missing():
    log = make_log(actor_id=None, actor_type="Alice (Reviewer)")
    assert audit_module.is_reviewer_actor(log) is False


def test_to_days_returns_none_for_missing_values():
    assert audit_module.to_days(None, datetime.now()) is None
    assert audit_module.to_days(datetime.now(), None) is None


def test_to_days_returns_none_for_negative_duration():
    end = datetime(2026, 1, 1, 10, 0, 0)
    start = end + timedelta(days=1)
    assert audit_module.to_days(start, end) is None


def test_to_days_returns_days_for_valid_duration():
    start = datetime(2026, 1, 1, 10, 0, 0)
    end = start + timedelta(days=2)
    assert audit_module.to_days(start, end) == 2.0


def test_average_returns_zero_for_empty_list():
    assert audit_module.average([]) == 0.0


def test_average_rounds_to_two_decimal_places():
    assert audit_module.average([1.0, 2.0, 2.0]) == 1.67


# ----------------------------
# Grouping and serialization
# ----------------------------

def test_get_all_logs_grouped_groups_by_application_id():
    db = FakeDB()
    logs = [
        make_log(application_id="APP-1", audit_id=1),
        make_log(application_id="APP-1", audit_id=2),
        make_log(application_id="APP-2", audit_id=1),
    ]
    db.set_logs(logs)

    grouped = audit_module.get_all_logs_grouped(db)

    assert set(grouped.keys()) == {"APP-1", "APP-2"}
    assert len(grouped["APP-1"]) == 2
    assert len(grouped["APP-2"]) == 1


def test_get_audit_trail_by_application_serializes_logs():
    db = FakeDB()
    app = make_app(application_id="APP-1", user_id="USER-1")
    created_at = datetime(2026, 1, 1, 12, 0, 0)
    logs = [
        make_log(
            application_id="APP-1",
            audit_id=10,
            actor_id="USER-1",
            actor_type="Applicant",
            event_type="APPLICATION_SUBMITTED",
            entity_type="APPLICATION",
            entity_id="ENT-1",
            from_status="Draft",
            to_status="Submitted",
            description="Submitted app",
            created_at=created_at,
        )
    ]
    db.set_query(audit_module.ApplicationForm, first=app)
    db.set_logs(logs)

    result = audit_module.get_audit_trail_by_application(
        "APP-1",
        db=db,
        current_user=SME_USER,
    )

    assert len(result) == 1
    assert result[0]["application_id"] == "APP-1"
    assert result[0]["audit_id"] == 10
    assert result[0]["actor_id"] == "USER-1"
    assert result[0]["event_type"] == "APPLICATION_SUBMITTED"
    assert result[0]["from_status"] == "Draft"
    assert result[0]["to_status"] == "Submitted"
    assert result[0]["created_at"] == created_at


# ----------------------------
# Overview metrics
# ----------------------------

def test_get_audit_metrics_overview_empty_logs():
    db = FakeDB()
    db.set_logs([])

    result = audit_module.get_audit_metrics_overview(
        db=db,
        current_user=STAFF_USER,
    )

    assert result == {
        "totalApplications": 0,
        "avgProcessingTimeDays": 0.0,
        "escalationRate": 0.0,
        "avgManualReviewTimeDays": 0.0,
        "totalEscalations": 0,
    }


def test_get_audit_metrics_overview_basic_processing_and_manual_review():
    db = FakeDB()
    base = datetime(2026, 1, 1, 9, 0, 0)

    logs = [
        # APP-1: submitted -> manual review -> approved
        make_log(
            application_id="APP-1",
            audit_id=1,
            event_type="APPLICATION_SUBMITTED",
            to_status="Submitted",
            created_at=base,
        ),
        make_log(
            application_id="APP-1",
            audit_id=2,
            event_type="APPLICATION_SENT_TO_MANUAL_REVIEW",
            from_status="Under Review",
            to_status="Under Manual Review",
            created_at=base + timedelta(days=1),
        ),
        make_log(
            application_id="APP-1",
            audit_id=3,
            event_type="APPLICATION_APPROVED",
            to_status="Approved",
            created_at=base + timedelta(days=3),
        ),
        # APP-2: submitted -> rejected (no manual review)
        make_log(
            application_id="APP-2",
            audit_id=1,
            event_type="APPLICATION_SUBMITTED",
            to_status="Submitted",
            created_at=base,
        ),
        make_log(
            application_id="APP-2",
            audit_id=2,
            event_type="APPLICATION_REJECTED",
            to_status="Rejected",
            created_at=base + timedelta(days=2),
        ),
    ]
    db.set_logs(logs)

    result = audit_module.get_audit_metrics_overview(
        db=db,
        current_user=STAFF_USER,
    )

    assert result["totalApplications"] == 2
    assert result["avgProcessingTimeDays"] == 2.5
    assert result["escalationRate"] == 50.0
    assert result["avgManualReviewTimeDays"] == 2.0
    assert result["totalEscalations"] == 1


def test_get_audit_metrics_overview_detects_manual_review_from_status_transition():
    db = FakeDB()
    base = datetime(2026, 1, 1, 9, 0, 0)

    logs = [
        make_log(
            application_id="APP-1",
            audit_id=1,
            event_type="something_else",
            to_status="Submitted",
            created_at=base,
        ),
        make_log(
            application_id="APP-1",
            audit_id=2,
            event_type="status_change",
            from_status="Under Review",
            to_status="Under Manual Review",
            created_at=base + timedelta(days=2),
        ),
        make_log(
            application_id="APP-1",
            audit_id=3,
            event_type="APPLICATION_APPROVED",
            to_status="Approved",
            created_at=base + timedelta(days=5),
        ),
    ]
    db.set_logs(logs)

    result = audit_module.get_audit_metrics_overview(
        db=db,
        current_user=STAFF_USER,
    )

    assert result["totalApplications"] == 1
    assert result["totalEscalations"] == 1
    assert result["avgProcessingTimeDays"] == 5.0
    assert result["avgManualReviewTimeDays"] == 3.0


# ----------------------------
# Staff leaderboard
# ----------------------------

def test_get_staff_leaderboard_empty_logs():
    db = FakeDB()
    db.set_logs([])
    db.set_query(audit_module.User, all=[])

    result = audit_module.get_staff_leaderboard(
        db=db,
        current_user=STAFF_USER,
    )

    assert result == []


def test_get_staff_leaderboard_only_reviewers_appear():
    db = FakeDB()
    base = datetime(2026, 1, 1, 9, 0, 0)

    db.set_query(
        audit_module.User,
        all=[
            make_user(user_id="R1", first_name="Alice", last_name="Reviewer", user_role="STAFF"),
        ],
    )

    logs = [
        make_log(
            application_id="APP-1",
            audit_id=1,
            actor_id="USER-1",
            actor_type="Applicant",
            event_type="APPLICATION_SUBMITTED",
            to_status="Submitted",
            created_at=base,
        ),
        make_log(
            application_id="APP-1",
            audit_id=2,
            actor_id="R1",
            actor_type="Alice (Reviewer)",
            event_type="APPLICATION_APPROVED",
            to_status="Approved",
            created_at=base + timedelta(days=2),
        ),
    ]
    db.set_logs(logs)

    result = audit_module.get_staff_leaderboard(
        db=db,
        current_user=STAFF_USER,
    )

    assert len(result) == 1
    assert result[0]["staffId"] == "R1"
    assert result[0]["staffName"] == "Alice Reviewer"
    assert result[0]["processed"] == 1
    assert result[0]["approvalRate"] == 100.0
    assert result[0]["rank"] == 1


def test_get_staff_leaderboard_calculates_processed_approval_rate_and_rank():
    db = FakeDB()
    base = datetime(2026, 1, 1, 9, 0, 0)

    db.set_query(
        audit_module.User,
        all=[
            make_user(user_id="R1", first_name="Alice", last_name="Reviewer", user_role="STAFF"),
            make_user(user_id="R2", first_name="Bob", last_name="Reviewer", user_role="STAFF"),
        ],
    )

    logs = [
        # APP-1 handled by R1, approved after manual review
        make_log(
            application_id="APP-1",
            audit_id=1,
            actor_id="USER-1",
            actor_type="Applicant",
            event_type="APPLICATION_SUBMITTED",
            to_status="Submitted",
            created_at=base,
        ),
        make_log(
            application_id="APP-1",
            audit_id=2,
            actor_id="R1",
            actor_type="Alice (Reviewer)",
            event_type="APPLICATION_SENT_TO_MANUAL_REVIEW",
            to_status="Under Manual Review",
            created_at=base + timedelta(days=1),
        ),
        make_log(
            application_id="APP-1",
            audit_id=3,
            actor_id="R1",
            actor_type="Alice (Reviewer)",
            event_type="APPLICATION_APPROVED",
            to_status="Approved",
            created_at=base + timedelta(days=3),
        ),
        # APP-2 handled by R1, rejected
        make_log(
            application_id="APP-2",
            audit_id=1,
            actor_id="USER-2",
            actor_type="Applicant",
            event_type="APPLICATION_SUBMITTED",
            to_status="Submitted",
            created_at=base,
        ),
        make_log(
            application_id="APP-2",
            audit_id=2,
            actor_id="R1",
            actor_type="Alice (Reviewer)",
            event_type="APPLICATION_REJECTED",
            to_status="Rejected",
            created_at=base + timedelta(days=2),
        ),
        # APP-3 handled by R2, approved
        make_log(
            application_id="APP-3",
            audit_id=1,
            actor_id="USER-3",
            actor_type="Applicant",
            event_type="APPLICATION_SUBMITTED",
            to_status="Submitted",
            created_at=base,
        ),
        make_log(
            application_id="APP-3",
            audit_id=2,
            actor_id="R2",
            actor_type="Bob (Reviewer)",
            event_type="APPLICATION_APPROVED",
            to_status="Approved",
            created_at=base + timedelta(days=1),
        ),
    ]
    db.set_logs(logs)

    result = audit_module.get_staff_leaderboard(
        db=db,
        current_user=STAFF_USER,
    )

    assert len(result) == 2

    assert result[0]["staffId"] == "R1"
    assert result[0]["staffName"] == "Alice Reviewer"
    assert result[0]["processed"] == 2
    assert result[0]["approvalRate"] == 50.0
    assert result[0]["escalationsHandled"] == 1
    assert result[0]["avgReviewTimeDays"] == 2.5
    assert result[0]["rank"] == 1

    assert result[1]["staffId"] == "R2"
    assert result[1]["staffName"] == "Bob Reviewer"
    assert result[1]["processed"] == 1
    assert result[1]["approvalRate"] == 100.0
    assert result[1]["escalationsHandled"] == 0
    assert result[1]["avgReviewTimeDays"] == 1.0
    assert result[1]["rank"] == 2


def test_get_staff_leaderboard_ignores_non_reviewer_final_decisions():
    db = FakeDB()
    base = datetime(2026, 1, 1, 9, 0, 0)

    db.set_query(
        audit_module.User,
        all=[
            make_user(user_id="R1", first_name="Alice", last_name="Reviewer", user_role="STAFF"),
        ],
    )

    logs = [
        make_log(
            application_id="APP-1",
            audit_id=1,
            actor_id="USER-1",
            actor_type="Applicant",
            event_type="APPLICATION_SUBMITTED",
            to_status="Submitted",
            created_at=base,
        ),
        make_log(
            application_id="APP-1",
            audit_id=2,
            actor_id="SYSTEM",
            actor_type="System",
            event_type="APPLICATION_APPROVED",
            to_status="Approved",
            created_at=base + timedelta(days=1),
        ),
    ]
    db.set_logs(logs)

    result = audit_module.get_staff_leaderboard(
        db=db,
        current_user=STAFF_USER,
    )

    assert len(result) == 1
    assert result[0]["staffId"] == "R1"
    assert result[0]["staffName"] == "Alice Reviewer"
    assert result[0]["processed"] == 0
    assert result[0]["approvalRate"] == 0.0
    assert result[0]["escalationsHandled"] == 0
    assert result[0]["avgReviewTimeDays"] == 0.0
    assert result[0]["rank"] == 1