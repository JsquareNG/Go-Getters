from types import SimpleNamespace
import pytest
from fastapi import HTTPException, BackgroundTasks

import backend.api.application as application_module


# ----------------------------
# Generic fakes / helpers
# ----------------------------

class FakeQuery:
    def __init__(self, first_result=None, all_result=None):
        self._first_result = first_result
        self._all_result = all_result or []

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def outerjoin(self, *args, **kwargs):
        return self

    def first(self):
        return self._first_result

    def all(self):
        return self._all_result


class FakeDB:
    def __init__(self):
        self._query_map = {}
        self.added = []
        self.committed = False
        self.refreshed = []

    def set_query(self, model_or_tuple, *, first=None, all=None):
        self._query_map[model_or_tuple] = FakeQuery(first_result=first, all_result=all)

    def query(self, *models):
        key = models[0] if len(models) == 1 else models
        if key not in self._query_map:
            return FakeQuery()
        return self._query_map[key]

    def add(self, obj):
        self.added.append(obj)

    def add_all(self, objs):
        self.added.extend(objs)

    def flush(self):
        return None

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        self.refreshed.append(obj)

    def execute(self, *args, **kwargs):
        class FakeExecuteResult:
            def fetchall(self_inner):
                return []
        return FakeExecuteResult()


def make_app(
    application_id="APP-1",
    current_status="Draft",
    previous_status=None,
    form_data=None,
    user_id="USER-1",
    reviewer_id="REVIEWER-1",
    business_name="Test Biz",
):
    return SimpleNamespace(
        application_id=application_id,
        current_status=current_status,
        previous_status=previous_status,
        form_data=form_data or {},
        user_id=user_id,
        reviewer_id=reviewer_id,
        business_name=business_name,
        has_sent=False,
    )


def make_user(user_id="USER-1", first_name="John", last_name="Doe", email="john@example.com"):
    return SimpleNamespace(
        user_id=user_id,
        first_name=first_name,
        last_name=last_name,
        email=email,
    )


def make_action_request(
    action_request_id=1,
    application_id="APP-1",
    reviewer_id="REVIEWER-1",
    reason="Need more docs",
    status="OPEN",
    created_at=None,
):
    return SimpleNamespace(
        action_request_id=action_request_id,
        application_id=application_id,
        reviewer_id=reviewer_id,
        reason=reason,
        status=status,
        created_at=created_at,
    )


def make_action_request_item(
    item_id,
    action_request_id=1,
    item_type="DOCUMENT",
    document_name=None,
    document_desc=None,
    submitted_document_name=None,
    substitution_reason=None,
    is_substitute=False,
    question_text=None,
    answer_text=None,
    fulfilled=False,
    fulfilled_at=None,
):
    return SimpleNamespace(
        item_id=item_id,
        action_request_id=action_request_id,
        item_type=item_type,
        document_name=document_name,
        document_desc=document_desc,
        submitted_document_name=submitted_document_name,
        substitution_reason=substitution_reason,
        is_substitute=is_substitute,
        question_text=question_text,
        answer_text=answer_text,
        fulfilled=fulfilled,
        fulfilled_at=fulfilled_at,
    )


# ----------------------------
# apply_full_application_update
# ----------------------------

def test_apply_full_application_update_merges_new_form_data():
    app = make_app(form_data={"businessName": "Old Biz", "country": "SG"})

    payload = {
        "form_data": {
            "businessName": "New Biz",
            "businessType": "PT",
        }
    }

    application_module.apply_full_application_update(app, payload)
    assert app.form_data["businessName"] == "New Biz"
    assert app.form_data["country"] == "SG"
    assert app.form_data["businessType"] == "PT"


def test_apply_full_application_update_handles_empty_input():
    app = make_app(form_data={"country": "SG"})

    application_module.apply_full_application_update(app, {})

    assert app.form_data == {"country": "SG"}


# ----------------------------
# close_open_action_request_and_update_answers
# ----------------------------

def test_close_open_action_request_returns_none_when_no_open_request():
    db = FakeDB()
    db.set_query(application_module.ActionRequest, first=None)

    result = application_module.close_open_action_request_and_update_answers(
        db=db,
        application_id="APP-1",
        data={},
    )

    assert result is None


def test_close_open_action_request_raises_when_question_missing():
    db = FakeDB()

    ar = make_action_request(action_request_id=10, status="OPEN")
    items = [
        make_action_request_item(
            item_id="Q1",
            action_request_id=10,
            item_type="QUESTION",
            question_text="What is source of funds?",
        )
    ]

    db.set_query(application_module.ActionRequest, first=ar)
    db.set_query(application_module.ActionRequestItem, all=items)

    with pytest.raises(HTTPException) as exc:
        application_module.close_open_action_request_and_update_answers(
            db=db,
            application_id="APP-1",
            data={"question_answers": []},
        )

    assert exc.value.status_code == 400
    assert "missing_question_item_ids" in exc.value.detail


def test_close_open_action_request_closes_when_all_requirements_met():
    db = FakeDB()

    ar = make_action_request(action_request_id=10, status="OPEN")
    doc_item = make_action_request_item(
        item_id="D1",
        action_request_id=10,
        item_type="DOCUMENT",
        document_name="UBO Declaration",
    )
    q_item = make_action_request_item(
        item_id="Q1",
        action_request_id=10,
        item_type="QUESTION",
        question_text="Explain ownership structure",
    )

    db.set_query(application_module.ActionRequest, first=ar)
    db.set_query(application_module.ActionRequestItem, all=[doc_item, q_item])

    result = application_module.close_open_action_request_and_update_answers(
        db=db,
        application_id="APP-1",
        data={
            "question_answers": [
                {"item_id": "Q1", "answer_text": "Owned by founder directly"}
            ]
        },
    )

    assert result is ar
    assert ar.status == "CLOSED"

    # New function behavior for document items
    assert doc_item.fulfilled is False
    assert doc_item.fulfilled_at is not None
    assert doc_item.is_substitute is False
    assert doc_item.submitted_document_name is None
    assert doc_item.substitution_reason is None

    # Question items are explicitly fulfilled
    assert q_item.fulfilled is True
    assert q_item.fulfilled_at is not None
    assert q_item.answer_text == "Owned by founder directly"


# ----------------------------
# second_submit
# ----------------------------

def test_second_submit_invalid_status_raises_400(monkeypatch):
    db = FakeDB()
    app = make_app(current_status="Approved", previous_status="Under Manual Review")

    db.set_query(application_module.ApplicationForm, first=app)

    monkeypatch.setattr(application_module, "get_users_by_id", lambda db, user_id: "John Doe")

    with pytest.raises(HTTPException) as exc:
        application_module.second_submit(
            application_id="APP-1",
            background_tasks=BackgroundTasks(),
            data={},
            db=db,
        )

    assert exc.value.status_code == 400
    assert "secondSubmit not allowed" in exc.value.detail

def test_second_submit_first_submit_moves_draft_to_under_review(monkeypatch):
    db = FakeDB()
    background_tasks = BackgroundTasks()
    app = make_app(
        current_status="Draft",
        previous_status=None,
        form_data={"country": "SG", "businessName": "Old", "businessType": "PTE"},
        user_id="USER-1",
    )

    db.set_query(application_module.ApplicationForm, first=app)
    db.set_query(application_module.User, first=None)

    monkeypatch.setattr(application_module, "get_users_by_id", lambda db, user_id: "John Doe")
    monkeypatch.setattr(application_module, "add_bell", lambda **kwargs: None)
    monkeypatch.setattr(application_module, "create_audit_log", lambda **kwargs: None)
    monkeypatch.setattr(
        application_module,
        "build_application_submitted_email",
        lambda app, first_name: ("Submitted", "Your app is submitted"),
    )

    result = application_module.second_submit(
        application_id="APP-1",
        background_tasks=background_tasks,
        data={
            "form_data": {
                "businessName": "New Biz",
                "businessType": "PT",
                "country": "ID",
            },
            "email": "user@example.com",
            "firstName": "John",
        },
        db=db,
    )

    assert result["current_status"] == "Under Review"
    assert app.previous_status == "Draft"
    assert app.current_status == "Under Review"
    assert app.form_data["businessName"] == "New Biz"
    assert app.form_data["country"] == "ID"
    assert db.committed is True
    assert len(background_tasks.tasks) >= 2


def test_second_submit_resubmission_moves_to_under_manual_review(monkeypatch):
    db = FakeDB()
    background_tasks = BackgroundTasks()
    app = make_app(
        current_status="Requires Action",
        previous_status="Under Manual Review",
        user_id="USER-1",
        reviewer_id="REVIEWER-1",
    )

    reviewer = make_user(
        user_id="REVIEWER-1",
        first_name="Alice",
        last_name="Reviewer",
        email="reviewer@example.com",
    )

    db.set_query(application_module.ApplicationForm, first=app)
    db.set_query(application_module.User, first=reviewer)

    monkeypatch.setattr(application_module, "get_users_by_id", lambda db, user_id: "John Doe")
    monkeypatch.setattr(application_module, "add_bell", lambda **kwargs: None)
    monkeypatch.setattr(application_module, "create_audit_log", lambda **kwargs: None)
    monkeypatch.setattr(
        application_module,
        "close_open_action_request_and_update_answers",
        lambda db, application_id, data: make_action_request(status="CLOSED"),
    )
    monkeypatch.setattr(
        application_module,
        "build_user_manual_review_email",
        lambda app, first_name: ("Back in review", "User email"),
    )
    monkeypatch.setattr(
        application_module,
        "build_staff_manual_review_email",
        lambda app, first_name: ("Applicant responded", "Staff email"),
    )

    result = application_module.second_submit(
        application_id="APP-1",
        background_tasks=background_tasks,
        data={
            "email": "user@example.com",
            "firstName": "John",
            "question_answers": [{"item_id": "Q1", "answer_text": "Answer"}],
        },
        db=db,
    )

    assert result["current_status"] == "Under Manual Review"
    assert app.previous_status == "Requires Action"
    assert app.current_status == "Under Manual Review"
    assert result["emails_queued"]["user"] is True
    assert result["emails_queued"]["staff"] is True
    assert db.committed is True


# ----------------------------
# withdraw_application
# ----------------------------

def test_withdraw_application_closes_open_action_requests(monkeypatch):
    db = FakeDB()
    background_tasks = BackgroundTasks()

    app = make_app(
        current_status="Under Manual Review",
        previous_status="Under Review",
        user_id="USER-1",
        reviewer_id="REVIEWER-1",
    )
    open_ar_1 = make_action_request(action_request_id=1, status="OPEN")
    open_ar_2 = make_action_request(action_request_id=2, status="OPEN")

    applicant = make_user(
        user_id="USER-1",
        first_name="John",
        last_name="Doe",
        email="john@example.com",
    )
    reviewer = make_user(
        user_id="REVIEWER-1",
        first_name="Alice",
        last_name="Reviewer",
        email="alice@example.com",
    )

    db.set_query(application_module.ApplicationForm, first=app)
    db.set_query(application_module.ActionRequest, all=[open_ar_1, open_ar_2])

    original_query = db.query
    user_calls = {"count": 0}

    def query_override(*models):
        if models[0] == application_module.User:
            class UserQuery:
                def filter(self, *args, **kwargs):
                    return self

                def first(self):
                    user_calls["count"] += 1
                    return applicant if user_calls["count"] == 1 else reviewer
            return UserQuery()
        return original_query(*models)

    db.query = query_override

    monkeypatch.setattr(application_module, "get_users_by_id", lambda db, user_id: "John Doe")
    monkeypatch.setattr(application_module, "create_audit_log", lambda **kwargs: None)
    monkeypatch.setattr(
        application_module,
        "build_withdrawn_email",
        lambda app, first_name: ("Withdrawn", "Reviewer notice"),
    )

    result = application_module.withdraw_application(
        application_id="APP-1",
        background_tasks=background_tasks,
        db=db,
    )

    assert app.current_status == "Withdrawn"
    assert open_ar_1.status == "WITHDRAWN"
    assert open_ar_2.status == "WITHDRAWN"
    assert result["status"] == "Withdrawn"


# ----------------------------
# get_required_requirements
# ----------------------------

def test_get_required_requirements_separates_documents_and_questions():
    db = FakeDB()

    ar = make_action_request(action_request_id=99, status="OPEN", reason="Need more info")
    items = [
        make_action_request_item(
            item_id=1,
            action_request_id=99,
            item_type="DOCUMENT",
            document_name="Bank Statement",
            document_desc="Last 3 months",
        ),
        make_action_request_item(
            item_id=2,
            action_request_id=99,
            item_type="QUESTION",
            question_text="What is your monthly volume?",
            answer_text=None,
        ),
    ]

    db.set_query(application_module.ActionRequest, first=ar)
    db.set_query(application_module.ActionRequestItem, all=items)

    result = application_module.get_required_requirements("APP-1", db=db)

    assert result["application_id"] == "APP-1"
    assert result["action_request_id"] == 99
    assert len(result["required_documents"]) == 1
    assert len(result["required_questions"]) == 1
    assert result["required_documents"][0]["document_name"] == "Bank Statement"
    assert result["required_questions"][0]["question_text"] == "What is your monthly volume?"


# ----------------------------
# get_action_requests
# ----------------------------

def test_get_action_requests_groups_items_per_request():
    db = FakeDB()

    ar1 = make_action_request(action_request_id=1, status="OPEN", reason="Need docs")
    ar2 = make_action_request(action_request_id=2, status="CLOSED", reason="Need clarification")
    items_map = {
        1: [
            make_action_request_item(
                item_id=11,
                action_request_id=1,
                item_type="DOCUMENT",
                document_name="ACRA Profile",
                document_desc="Latest copy",
                is_substitute=False,
                submitted_document_name=None,
                substitution_reason=None,
            ),
            make_action_request_item(
                item_id=12,
                action_request_id=1,
                item_type="QUESTION",
                question_text="Who is the UBO?",
                answer_text=None,
            ),
        ],
        2: [
            make_action_request_item(
                item_id=21,
                action_request_id=2,
                item_type="QUESTION",
                question_text="Clarify source of funds",
                answer_text="Business revenue",
            )
        ],
    }

    original_query = db.query
    db.set_query(application_module.ActionRequest, all=[ar1, ar2])

    call_count = {"items": 0}

    def query_override(*models):
        if models[0] == application_module.ActionRequestItem:
            class ItemsQuery:
                def filter(self, *args, **kwargs):
                    return self

                def order_by(self, *args, **kwargs):
                    return self

                def all(self):
                    call_count["items"] += 1
                    return items_map[1] if call_count["items"] == 1 else items_map[2]
            return ItemsQuery()
        return original_query(*models)

    db.query = query_override

    result = application_module.get_action_requests("APP-1", db=db)

    assert result["application_id"] == "APP-1"
    assert len(result["action_requests"]) == 2

    first = result["action_requests"][0]
    assert first["reason"] == "Need docs"
    assert len(first["documents"]) == 1
    assert len(first["questions"]) == 1

    first_doc = first["documents"][0]
    assert first_doc["document_name"] == "ACRA Profile"
    assert first_doc["document_desc"] == "Latest copy"
    assert first_doc["is_substitute"] is False
    assert first_doc["submitted_document_name"] is None
    assert first_doc["substitution_reason"] is None

    second = result["action_requests"][1]
    assert len(second["documents"]) == 0
    assert len(second["questions"]) == 1
    assert second["questions"][0]["question_text"] == "Clarify source of funds"
    assert second["questions"][0]["answer_text"] == "Business revenue"

