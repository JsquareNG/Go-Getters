import pytest

import backend.api.resend as send_email_module


class FakeResponse:
    def __init__(self, status_code=202):
        self.status_code = status_code


def test_send_email_raises_when_api_key_missing(monkeypatch):
    monkeypatch.setattr(send_email_module, "SENDGRID_API_KEY", None)

    with pytest.raises(RuntimeError) as exc:
        send_email_module.send_email(
            to_email="user@example.com",
            subject="Test Subject",
            body="Hello",
        )

    assert str(exc.value) == "SENDGRID_API_KEY not set"


def test_send_email_calls_sendgrid_successfully(monkeypatch):
    monkeypatch.setattr(send_email_module, "SENDGRID_API_KEY", "fake-key")

    captured = {}

    class FakeSendGridClient:
        def __init__(self, api_key):
            captured["api_key"] = api_key

        def send(self, message):
            captured["message"] = message
            return FakeResponse(status_code=202)

    monkeypatch.setattr(send_email_module, "SendGridAPIClient", FakeSendGridClient)

    send_email_module.send_email(
        to_email="user@example.com",
        subject="Welcome",
        body="Hello there",
    )

    assert captured["api_key"] == "fake-key"

    message = captured["message"]

    assert message.subject.get() == "Welcome"

    assert message.from_email.email == send_email_module.FROM_EMAIL

    tos = message.personalizations[0].tos
    assert tos[0]["email"] == "user@example.com"

    content = message.contents[0].get()
    assert content["value"] == "Hello there"
    assert content["type"] == "text/plain"


def test_send_email_re_raises_sendgrid_exception(monkeypatch):
    monkeypatch.setattr(send_email_module, "SENDGRID_API_KEY", "fake-key")

    class FakeSendGridClient:
        def __init__(self, api_key):
            pass

        def send(self, message):
            raise Exception("Send failed")

    monkeypatch.setattr(send_email_module, "SendGridAPIClient", FakeSendGridClient)

    with pytest.raises(Exception) as exc:
        send_email_module.send_email(
            to_email="user@example.com",
            subject="Oops",
            body="Body",
        )

    assert str(exc.value) == "Send failed"