from types import SimpleNamespace

from backend.services.email_builders import (
    WEBSITE_URL,
    INTERNAL_URL,
    build_account_created_email,
    build_application_submitted_email,
    build_approved_email,
    build_rejected_email,
    build_withdrawn_email,
    build_staff_manual_review_email,
    build_user_manual_review_email,
    build_action_required_email,
)


def make_user(
    first_name="Jane",
    last_name="Tan",
    email="jane@example.com",
    user_id="U1",
):
    return SimpleNamespace(
        first_name=first_name,
        last_name=last_name,
        email=email,
        user_id=user_id,
    )


def make_app(
    application_id="APP-001",
    business_name="Acme Pte Ltd",
    form_data=None,
):
    return SimpleNamespace(
        application_id=application_id,
        business_name=business_name,
        form_data=form_data or {},
    )


def test_build_account_created_email():
    user = make_user(first_name="Jane")

    subject, body = build_account_created_email(user)

    assert subject == "Your Account Has Been Successfully Created"
    assert "Dear Jane," in body
    assert "Your account has been successfully created." in body
    assert WEBSITE_URL in body


def test_build_application_submitted_email():
    app = make_app(application_id="APP-123", business_name="Acme Pte Ltd")

    subject, body = build_application_submitted_email(app, "Jane")

    assert subject == "Application Submitted Successfully"
    assert 'Your application to open a business account for "Acme Pte Ltd" has been successfully submitted.' in body
    assert "Application ID: APP-123" in body
    assert "Current Status: Under Review" in body
    assert f"{WEBSITE_URL}/applications/APP-123" in body


def test_build_approved_email():
    app = make_app(application_id="APP-123", business_name="Acme Pte Ltd")

    subject, body = build_approved_email(app, "Jane")

    assert subject == "Application Approved"
    assert 'Your application to open a business account for "Acme Pte Ltd" has been approved.' in body
    assert "Application ID: APP-123" in body
    assert f"{WEBSITE_URL}/applications/APP-123" in body


def test_build_rejected_email():
    app = make_app(
        application_id="APP-123",
        business_name="Acme Pte Ltd",
        form_data={"reason": "Risk policy mismatch"},
    )

    subject, body = build_rejected_email(app, "Jane")

    assert subject == "Application Unsuccessful"
    assert 'Your application to open a business account for "Acme Pte Ltd" was unsuccessful.' in body
    assert "Application ID: APP-123" in body
    assert "Risk policy mismatch" in body
    assert f"{WEBSITE_URL}/applications/APP-123" in body


def test_build_withdrawn_email():
    app = make_app(application_id="APP-123", business_name="Acme Pte Ltd")

    subject, body = build_withdrawn_email(app, "Reviewer")

    assert subject == "Application Withdrawn"
    assert "withdrawn by the applicant" in body
    assert "Application ID: APP-123" in body
    assert "Business Name: Acme Pte Ltd" in body


def test_build_staff_manual_review_email():
    app = make_app(application_id="APP-123", business_name="Acme Pte Ltd")

    subject, body = build_staff_manual_review_email(app, "Alice")

    assert subject == "Manual Review Required: Application APP-123"
    assert "Dear Alice," in body
    assert "Application ID: APP-123" in body
    assert "Business Name: Acme Pte Ltd" in body
    assert INTERNAL_URL in body


def test_build_user_manual_review_email():
    app = make_app(application_id="APP-123", business_name="Acme Pte Ltd")

    subject, body = build_user_manual_review_email(app, "Jane")

    assert subject == "Application Under Manual Review"
    assert "Dear Jane," in body
    assert 'Your application for "Acme Pte Ltd" is undergoing additional review' in body
    assert "Application ID: APP-123" in body


def test_build_action_required_email_with_documents_and_questions():
    app = make_app(application_id="APP-123", business_name="Acme Pte Ltd")

    requested_docs = [
        {"document_name": "Bank Statement", "document_desc": "Last 3 months"},
        {"document_name": "UBO Declaration", "document_desc": ""},
    ]
    requested_qns = [
        {"question_text": "What is your source of funds?"},
        {"question_text": "Explain ownership structure"},
    ]

    subject, body = build_action_required_email(
        app=app,
        firstName="Jane",
        reason="Need more supporting information",
        requested_docs=requested_docs,
        requested_qns=requested_qns,
    )

    assert subject == "Action Required: Application Update Needed"
    assert "Dear Jane," in body
    assert 'Your application for "Acme Pte Ltd" requires further action.' in body
    assert "Application ID: APP-123" in body
    assert "Need more supporting information" in body

    assert "Requested Documents:" in body
    assert "- Bank Statement: Last 3 months" in body
    assert "- UBO Declaration" in body

    assert "Requested Clarifications:" in body
    assert "- What is your source of funds?" in body
    assert "- Explain ownership structure" in body

    assert f"{WEBSITE_URL}/applications/APP-123" in body


def test_build_action_required_email_with_no_documents_or_questions():
    app = make_app(application_id="APP-123", business_name="Acme Pte Ltd")

    subject, body = build_action_required_email(
        app=app,
        firstName="Jane",
        reason="Need follow-up",
        requested_docs=[],
        requested_qns=[],
    )

    assert subject == "Action Required: Application Update Needed"
    assert "Requested Documents:" in body
    assert "Requested Clarifications:" in body
    assert "None" in body


def test_build_action_required_email_ignores_blank_document_and_question_fields():
    app = make_app(application_id="APP-123", business_name="Acme Pte Ltd")

    requested_docs = [
        {"document_name": "   ", "document_desc": "   "},
        {"document_name": "ACRA Profile", "document_desc": "   "},
    ]
    requested_qns = [
        {"question_text": "   "},
        {"question_text": "Confirm registered address"},
    ]

    subject, body = build_action_required_email(
        app=app,
        firstName="Jane",
        reason="Need clarification",
        requested_docs=requested_docs,
        requested_qns=requested_qns,
    )

    assert subject == "Action Required: Application Update Needed"
    assert "- ACRA Profile" in body
    assert "- Confirm registered address" in body
    assert "- :" not in body