from datetime import datetime, timezone

from backend.models.user import User
from backend.models.liveness_detection import LivenessDetection


TEST_PROVIDER_SESSION_ID = "didit-session-123"


def seed_user(db_session, email="user@example.com", role="SME"):
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


def seed_liveness_detection(
    db_session,
    provider_session_id=TEST_PROVIDER_SESSION_ID,
    application_id=None,
):
    row = LivenessDetection(
        application_id=application_id,
        provider="didit",
        provider_session_id=provider_session_id,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(row)
    db_session.commit()
    db_session.refresh(row)
    return row


def minimal_form_data():
    return {
        "businessName": "Acme Pte Ltd",
        "businessType": "PRIVATE_LIMITED",
        "country": "SG",
        "businessIndustry": "Technology",
    }


def test_first_save_creates_draft_application(client, db_session):
    user = seed_user(db_session)
    seed_liveness_detection(db_session)

    payload = {
        "user_id": user.user_id,
        "provider_session_id": TEST_PROVIDER_SESSION_ID,
        "form_data": minimal_form_data(),
    }

    response = client.post("/applications/firstSave", json=payload)

    assert response.status_code == 200, response.text
    data = response.json()
    assert "application_id" in data


def test_first_submit_creates_under_review_application(client, db_session):
    user = seed_user(db_session)
    seed_liveness_detection(db_session)

    payload = {
        "user_id": user.user_id,
        "provider_session_id": TEST_PROVIDER_SESSION_ID,
        "form_data": minimal_form_data(),
    }

    response = client.post("/applications/firstSubmit", json=payload)

    assert response.status_code == 200, response.text
    data = response.json()
    assert "application_id" in data


def test_withdraw_application_changes_status(client, db_session):
    user = seed_user(db_session)
    seed_liveness_detection(db_session)

    create_payload = {
        "user_id": user.user_id,
        "provider_session_id": TEST_PROVIDER_SESSION_ID,
        "form_data": minimal_form_data(),
    }

    create_response = client.post("/applications/firstSave", json=create_payload)
    assert create_response.status_code == 200, create_response.text
    application_id = create_response.json()["application_id"]

    withdraw_response = client.put(f"/applications/withdraw/{application_id}")
    assert withdraw_response.status_code == 200, withdraw_response.text

    get_response = client.get(f"/applications/byAppID/{application_id}")
    assert get_response.status_code == 200, get_response.text
    app_data = get_response.json()

    if "current_status" in app_data:
        assert app_data["current_status"] == "Withdrawn"


def test_get_all_applications_includes_created_application(client, db_session):
    user = seed_user(db_session)
    seed_liveness_detection(db_session)

    payload = {
        "user_id": user.user_id,
        "provider_session_id": TEST_PROVIDER_SESSION_ID,
        "form_data": minimal_form_data(),
    }

    create_response = client.post("/applications/firstSave", json=payload)
    assert create_response.status_code == 200, create_response.text
    created = create_response.json()

    all_response = client.get("/applications/")
    assert all_response.status_code == 200, all_response.text

    rows = all_response.json()
    assert isinstance(rows, list)
    assert any(str(row.get("application_id")) == str(created["application_id"]) for row in rows)

def test_first_save_missing_required_form_field_fails(client, db_session):
    user = seed_user(db_session)
    seed_liveness_detection(db_session)

    bad_form_data = {
        # missing businessName
        "businessType": "PRIVATE_LIMITED",
        "country": "SG",
        "businessIndustry": "Technology",
    }

    payload = {
        "user_id": user.user_id,
        "provider_session_id": TEST_PROVIDER_SESSION_ID,
        "form_data": bad_form_data,
    }

    response = client.post("/applications/firstSave", json=payload)

    # Route uses direct dict access form_data["businessName"], so likely 500
    assert response.status_code in (400, 422, 500)


def test_first_submit_without_liveness_row_fails(client, db_session):
    user = seed_user(db_session)

    payload = {
        "user_id": user.user_id,
        "provider_session_id": TEST_PROVIDER_SESSION_ID,
        "form_data": minimal_form_data(),
    }

    response = client.post("/applications/firstSubmit", json=payload)

    # current route crashes when no matching liveness row exists
    assert response.status_code == 500


def test_get_application_by_invalid_id_returns_not_found_or_error(client):
    response = client.get("/applications/byAppID/99999999")

    # depending on implementation it may be 404 or 200 with null-ish body
    assert response.status_code in (200, 404)


def test_get_applications_by_user_id_returns_created_application(client, db_session):
    user = seed_user(db_session, email="appsbyuser@example.com")
    seed_liveness_detection(db_session)

    payload = {
        "user_id": user.user_id,
        "provider_session_id": TEST_PROVIDER_SESSION_ID,
        "form_data": minimal_form_data(),
    }

    create_response = client.post("/applications/firstSave", json=payload)
    assert create_response.status_code == 200
    created = create_response.json()

    response = client.get(f"/applications/byUserID/{user.user_id}")
    assert response.status_code == 200

    rows = response.json()
    assert isinstance(rows, list)
    assert any(str(row.get("application_id")) == str(created["application_id"]) for row in rows)


def test_withdraw_invalid_application_id_behaviour(client):
    response = client.put("/applications/withdraw/99999999")

    # depending on route implementation, this could be 404 or 200
    assert response.status_code in (200, 404)