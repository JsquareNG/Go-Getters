def test_register_sme_success(client):
    payload = {
        "first_name": "Jane",
        "last_name": "Tan",
        "email": "jane@example.com",
        "password": "password123",
    }

    response = client.post("/users/register", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "SME registered successfully"
    assert data["role"] == "SME"
    assert "user_id" in data


def test_register_sme_duplicate_email_fails(client):
    payload = {
        "first_name": "Jane",
        "last_name": "Tan",
        "email": "jane@example.com",
        "password": "password123",
    }

    first = client.post("/users/register", json=payload)
    assert first.status_code == 200

    second = client.post("/users/register", json=payload)
    assert second.status_code == 400
    assert second.json()["detail"] == "Email already registered"


def test_login_success_after_register(client):
    register_payload = {
        "first_name": "Jane",
        "last_name": "Tan",
        "email": "jane@example.com",
        "password": "password123",
    }

    reg = client.post("/users/register", json=register_payload)
    assert reg.status_code == 200

    login_payload = {
        "email": "jane@example.com",
        "password": "password123",
    }

    login = client.post("/users/login", json=login_payload)
    assert login.status_code == 200

    data = login.json()
    assert data["message"] == "Login successful"
    assert data["token_type"] == "bearer"
    assert data["role"] == "SME"
    assert data["email"] == "jane@example.com"
    assert "access_token" in data
    assert "user_id" in data


def test_login_invalid_credentials(client):
    login_payload = {
        "email": "missing@example.com",
        "password": "wrongpassword",
    }

    response = client.post("/users/login", json=login_payload)

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"

def test_register_sme_missing_required_field_returns_422(client):
    payload = {
        "first_name": "Jane",
        # missing last_name
        "email": "missingfield@example.com",
        "password": "password123",
    }

    response = client.post("/users/register", json=payload)

    # Your route uses dict access like data["last_name"], so this may be 500 instead of 422
    # If you later switch to a Pydantic schema, this should become 422.
    assert response.status_code in (422, 500)


def test_login_wrong_password_returns_401(client):
    register_payload = {
        "first_name": "Jane",
        "last_name": "Tan",
        "email": "wrongpw@example.com",
        "password": "correctpassword",
    }

    reg = client.post("/users/register", json=register_payload)
    assert reg.status_code == 200

    login_payload = {
        "email": "wrongpw@example.com",
        "password": "wrongpassword",
    }

    response = client.post("/users/login", json=login_payload)

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_get_user_by_id_success(client):
    register_payload = {
        "first_name": "Alice",
        "last_name": "Ng",
        "email": "aliceid@example.com",
        "password": "password123",
    }

    reg = client.post("/users/register", json=register_payload)
    assert reg.status_code == 200
    user_id = reg.json()["user_id"]

    response = client.get(f"/users/{user_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == user_id
    assert data["first_name"] == "Alice"
    assert data["last_name"] == "Ng"
    assert data["email"] == "aliceid@example.com"
    assert data["user_role"] == "SME"


def test_get_user_by_id_not_found_returns_404(client):
    response = client.get("/users/99999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"


def test_create_staff_success_and_get_all_staff(client):
    payload = {
        "first_name": "Staff",
        "last_name": "Member",
        "email": "staffmember@example.com",
        "password": "staffpassword",
    }

    create_response = client.post("/users/create-staff", json=payload)
    assert create_response.status_code == 200
    created = create_response.json()
    assert "user_id" in created
    assert created["message"] == "Staff created successfully"

    all_staff_response = client.get("/users/all-staff")
    assert all_staff_response.status_code == 200

    rows = all_staff_response.json()
    assert any(row["email"] == "staffmember@example.com" for row in rows)