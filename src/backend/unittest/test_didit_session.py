import pytest
from fastapi import HTTPException

import backend.api.didit_session as didit_module


# ----------------------------
# Helpers / fakes
# ----------------------------

class FakeResponse:
    def __init__(self, status_code=200, json_data=None, text="ok"):
        self.status_code = status_code
        self._json_data = json_data or {}
        self.text = text

    def json(self):
        return self._json_data


class FakeRequest:
    def __init__(self, payload):
        self._payload = payload

    async def json(self):
        return self._payload


# ----------------------------
# create_didit_session
# ----------------------------

def test_create_didit_session_raises_when_api_key_missing(monkeypatch):
    monkeypatch.setattr(didit_module, "DIDIT_API_KEY", None)
    monkeypatch.setattr(didit_module, "DIDIT_WORKFLOW_ID", "workflow-123")

    payload = didit_module.CreateSessionRequest(
        application_id="APP-1",
        user_id="USER-1",
        callback_url="https://callback.test",
    )

    with pytest.raises(HTTPException) as exc:
        didit_module.create_didit_session(payload)

    assert exc.value.status_code == 500
    assert exc.value.detail == "Missing DIDIT_API_KEY"


def test_create_didit_session_raises_when_workflow_id_missing(monkeypatch):
    monkeypatch.setattr(didit_module, "DIDIT_API_KEY", "key-123")
    monkeypatch.setattr(didit_module, "DIDIT_WORKFLOW_ID", None)

    payload = didit_module.CreateSessionRequest()

    with pytest.raises(HTTPException) as exc:
        didit_module.create_didit_session(payload)

    assert exc.value.status_code == 500
    assert exc.value.detail == "Missing DIDIT_WORKFLOW_ID"


def test_create_didit_session_builds_full_body_and_returns_mapped_response(monkeypatch):
    monkeypatch.setattr(didit_module, "DIDIT_API_KEY", "key-123")
    monkeypatch.setattr(didit_module, "DIDIT_WORKFLOW_ID", "workflow-123")

    captured = {}

    def fake_post(url, headers, json, timeout):
        captured["url"] = url
        captured["headers"] = headers
        captured["json"] = json
        captured["timeout"] = timeout
        return FakeResponse(
            status_code=201,
            json_data={
                "session_id": "sess-001",
                "verification_url": "https://verify.test/abc",
                "extra": "value",
            },
            text="created",
        )

    monkeypatch.setattr(didit_module.requests, "post", fake_post)

    payload = didit_module.CreateSessionRequest(
        application_id="APP-1",
        user_id="USER-1",
        callback_url="https://callback.test/hook",
    )

    result = didit_module.create_didit_session(payload)

    assert captured["url"] == didit_module.DIDIT_CREATE_SESSION_URL
    assert captured["headers"]["x-api-key"] == "key-123"
    assert captured["json"]["workflow_id"] == "workflow-123"
    assert captured["json"]["callback"] == "https://callback.test/hook"
    assert captured["json"]["vendor_data"] == "APP-1"
    assert captured["json"]["metadata"] == {"user_id": "USER-1"}
    assert captured["timeout"] == 30

    assert result["session_id"] == "sess-001"
    assert result["verification_url"] == "https://verify.test/abc"
    assert result["raw"]["extra"] == "value"


def test_create_didit_session_uses_default_callback_and_optional_fields_absent(monkeypatch):
    monkeypatch.setattr(didit_module, "DIDIT_API_KEY", "key-123")
    monkeypatch.setattr(didit_module, "DIDIT_WORKFLOW_ID", "workflow-123")

    captured = {}

    def fake_post(url, headers, json, timeout):
        captured["json"] = json
        return FakeResponse(
            status_code=200,
            json_data={
                "id": "fallback-id",
                "url": "https://verify.test/fallback",
            },
            text="ok",
        )

    monkeypatch.setattr(didit_module.requests, "post", fake_post)

    payload = didit_module.CreateSessionRequest()

    result = didit_module.create_didit_session(payload)

    assert captured["json"]["workflow_id"] == "workflow-123"
    assert captured["json"]["callback"] == "http://localhost:5173/application/edit/new/1"
    assert "vendor_data" not in captured["json"]
    assert "metadata" not in captured["json"]

    assert result["session_id"] == "fallback-id"
    assert result["verification_url"] == "https://verify.test/fallback"


def test_create_didit_session_raises_http_exception_for_non_200_response(monkeypatch):
    monkeypatch.setattr(didit_module, "DIDIT_API_KEY", "key-123")
    monkeypatch.setattr(didit_module, "DIDIT_WORKFLOW_ID", "workflow-123")

    def fake_post(url, headers, json, timeout):
        return FakeResponse(status_code=422, text="unprocessable entity")

    monkeypatch.setattr(didit_module.requests, "post", fake_post)

    payload = didit_module.CreateSessionRequest(application_id="APP-1")

    with pytest.raises(HTTPException) as exc:
        didit_module.create_didit_session(payload)

    assert exc.value.status_code == 422
    assert exc.value.detail == "unprocessable entity"


def test_create_didit_session_wraps_unexpected_exception_as_500(monkeypatch):
    monkeypatch.setattr(didit_module, "DIDIT_API_KEY", "key-123")
    monkeypatch.setattr(didit_module, "DIDIT_WORKFLOW_ID", "workflow-123")

    def fake_post(url, headers, json, timeout):
        raise RuntimeError("network exploded")

    monkeypatch.setattr(didit_module.requests, "post", fake_post)

    payload = didit_module.CreateSessionRequest(application_id="APP-1")

    with pytest.raises(HTTPException) as exc:
        didit_module.create_didit_session(payload)

    assert exc.value.status_code == 500
    assert exc.value.detail == "network exploded"


# ----------------------------
# get_session_decision
# ----------------------------

def test_get_session_decision_raises_when_api_key_missing(monkeypatch):
    monkeypatch.setattr(didit_module, "DIDIT_API_KEY", None)

    with pytest.raises(HTTPException) as exc:
        didit_module.get_session_decision("sess-001")

    assert exc.value.status_code == 500
    assert exc.value.detail == "Missing DIDIT_API_KEY"


def test_get_session_decision_success(monkeypatch):
    monkeypatch.setattr(didit_module, "DIDIT_API_KEY", "key-123")

    captured = {}

    def fake_get(url, headers, timeout):
        captured["url"] = url
        captured["headers"] = headers
        captured["timeout"] = timeout
        return FakeResponse(
            status_code=200,
            json_data={"status": "approved", "session_id": "sess-001"},
            text="ok",
        )

    monkeypatch.setattr(didit_module.requests, "get", fake_get)

    result = didit_module.get_session_decision("sess-001")

    assert captured["url"] == "https://verification.didit.me/v3/session/sess-001/decision/"
    assert captured["headers"]["x-api-key"] == "key-123"
    assert captured["headers"]["accept"] == "application/json"
    assert captured["timeout"] == 30

    assert result == {"status": "approved", "session_id": "sess-001"}


def test_get_session_decision_raises_for_non_200(monkeypatch):
    monkeypatch.setattr(didit_module, "DIDIT_API_KEY", "key-123")

    def fake_get(url, headers, timeout):
        return FakeResponse(status_code=404, text="not found")

    monkeypatch.setattr(didit_module.requests, "get", fake_get)

    with pytest.raises(HTTPException) as exc:
        didit_module.get_session_decision("sess-404")

    assert exc.value.status_code == 404
    assert exc.value.detail == "not found"


# ----------------------------
# webhook
# ----------------------------

@pytest.mark.asyncio
async def test_didit_webhook_returns_ok():
    payload = {
        "session_id": "sess-001",
        "status": "approved",
    }
    request = FakeRequest(payload)

    result = await didit_module.didit_webhook(request)

    assert result == {"ok": True}


@pytest.mark.asyncio
async def test_didit_webhook_handles_missing_fields():
    payload = {
        "unexpected": "value"
    }
    request = FakeRequest(payload)

    result = await didit_module.didit_webhook(request)

    assert result == {"ok": True}