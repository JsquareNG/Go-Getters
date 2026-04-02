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

