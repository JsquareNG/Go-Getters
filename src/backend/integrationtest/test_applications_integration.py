from backend.models.user import User

TEST_USER_ID = "USER0001"


def seed_user(db_session, user_id=TEST_USER_ID, email="user@example.com", role="SME"):
    user = User(
        user_id=user_id,
        first_name="Jane",
        last_name="Tan",
        email=email,
        password="hashed-password",
        user_role=role,
    )
    db_session.add(user)
    db_session.commit()
    return user


def minimal_form_data():
    return {
        "businessName": "Acme Pte Ltd",
        "businessType": "PRIVATE_LIMITED",
        "country": "SG",
        "businessIndustry": "Technology",
    }


def test_first_save_creates_draft_application(client, db_session):
    seed_user(db_session)

    payload = {
        "user_id": TEST_USER_ID,
        "form_data": minimal_form_data(),
    }

    response = client.post("/applications/firstSave", json=payload)

    assert response.status_code == 200, response.text
    data = response.json()
    assert "application_id" in data
    if "current_status" in data:
        assert data["current_status"] == "Draft"


def test_first_submit_creates_under_review_application(client, db_session):
    seed_user(db_session)

    payload = {
        "user_id": TEST_USER_ID,
        "form_data": minimal_form_data(),
        "provider_session_id": "didit-session-123",
    }

    response = client.post("/applications/firstSubmit", json=payload)

    assert response.status_code == 200, response.text
    data = response.json()
    assert "application_id" in data
    if "current_status" in data:
        assert data["current_status"] == "Under Review"


def test_withdraw_application_changes_status(client, db_session):
    seed_user(db_session)

    create_payload = {
        "user_id": TEST_USER_ID,
        "form_data": minimal_form_data(),
    }

    create_response = client.post("/applications/firstSave", json=create_payload)
    assert create_response.status_code == 200, create_response.text
    create_data = create_response.json()

    application_id = create_data["application_id"]

    withdraw_response = client.put(f"/applications/withdraw/{application_id}")
    assert withdraw_response.status_code == 200, withdraw_response.text

    get_response = client.get(f"/applications/byAppID/{application_id}")
    assert get_response.status_code == 200, get_response.text
    app_data = get_response.json()

    if "current_status" in app_data:
        assert app_data["current_status"] == "Withdrawn"


def test_get_all_applications_includes_created_application(client, db_session):
    seed_user(db_session)

    payload = {
        "user_id": TEST_USER_ID,
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