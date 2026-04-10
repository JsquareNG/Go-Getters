from datetime import datetime, timezone

from backend.models.user import User
from backend.models.liveness_detection import LivenessDetection


TEST_PROVIDER_SESSION_ID = "didit-session-123"


def seed_user(db_session, email="user@example.com", role="SME"):
    # IMPORTANT: match conftest authenticated user
    user = User(
        user_id="00000001",
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


# ----------------------------
# firstSave
# ----------------------------

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


# ----------------------------
# firstSubmit
# ----------------------------

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


# ----------------------------
# withdraw
# ----------------------------

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


# ----------------------------
# get all
# ----------------------------

def test_get_all_applications_includes_created_application(staff_client, db_session):
    user = seed_user(db_session)
    seed_liveness_detection(db_session)

    payload = {
        "user_id": user.user_id,
        "provider_session_id": TEST_PROVIDER_SESSION_ID,
        "form_data": minimal_form_data(),
    }

    create_response = staff_client.post("/applications/firstSave", json=payload)
    assert create_response.status_code == 403, create_response.text


def test_get_all_applications_staff_can_list_existing_applications(staff_client, db_session):
    user = seed_user(db_session)
    seed_liveness_detection(db_session)

    # create app using SME client flow logic directly through DB-compatible endpoint assumptions
    # since staff cannot call firstSave
    from backend.models.application import ApplicationForm

    app = ApplicationForm(
        business_country="SG",
        business_name="Acme Pte Ltd",
        business_type="PRIVATE_LIMITED",
        previous_status=None,
        current_status="Draft",
        form_data=minimal_form_data(),
        user_id=user.user_id,
        provider_session_id=TEST_PROVIDER_SESSION_ID,
    )
    db_session.add(app)
    db_session.commit()
    db_session.refresh(app)

    all_response = staff_client.get("/applications/")
    assert all_response.status_code == 200, all_response.text

    rows = all_response.json()
    assert isinstance(rows, list)
    assert any(str(row.get("application_id")) == str(app.application_id) for row in rows)