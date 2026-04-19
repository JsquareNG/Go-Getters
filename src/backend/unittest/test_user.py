import pytest
from fastapi import HTTPException

import backend.api.user as user_module


class FakeQuery:
    def __init__(self, first_result=None, all_result=None):
        self._first_result = first_result
        self._all_result = all_result or []

    def filter(self, *args, **kwargs):
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

    def set_query(self, model, *, first=None, all=None):
        self._query_map[model] = FakeQuery(first_result=first, all_result=all)

    def query(self, model):
        return self._query_map.get(model, FakeQuery())

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        self.refreshed.append(obj)


class FakeUser:
    def __init__(
        self,
        user_id="U1",
        first_name="John",
        last_name="Doe",
        email="john@example.com",
        password="hashed-password",
        user_role="SME",
    ):
        self.user_id = user_id
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.password = password
        self.user_role = user_role


SME_USER = {"user_id": "U1", "role": "SME"}
OTHER_SME_USER = {"user_id": "U2", "role": "SME"}
STAFF_USER = {"user_id": "S1", "role": "STAFF"}
MGMT_USER = {"user_id": "M1", "role": "MANAGEMENT"}


def test_hash_password_returns_different_string():
    plain = "my-secret-password"
    hashed = user_module.hash_password(plain)

    assert hashed != plain
    assert isinstance(hashed, str)
    assert len(hashed) > 0


def test_verify_password_returns_true_for_correct_password():
    plain = "correct-password"
    hashed = user_module.hash_password(plain)

    assert user_module.verify_password(plain, hashed) is True


def test_verify_password_returns_false_for_wrong_password():
    plain = "correct-password"
    hashed = user_module.hash_password(plain)

    assert user_module.verify_password("wrong-password", hashed) is False


def test_register_sme_raises_when_email_already_registered():
    db = FakeDB()
    existing_user = FakeUser(email="existing@example.com")
    db.set_query(user_module.User, first=existing_user)

    payload = {
        "first_name": "Jane",
        "last_name": "Tan",
        "email": "existing@example.com",
        "password": "password123",
    }

    with pytest.raises(HTTPException) as exc:
        user_module.register_sme(data=payload, db=db)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Email already registered"


def test_register_sme_creates_user_successfully():
    db = FakeDB()
    db.set_query(user_module.User, first=None)

    payload = {
        "first_name": "Jane",
        "last_name": "Tan",
        "email": "jane@example.com",
        "password": "password123",
    }

    result = user_module.register_sme(data=payload, db=db)

    assert db.committed is True
    assert len(db.added) == 1

    new_user = db.added[0]
    assert new_user.first_name == "Jane"
    assert new_user.last_name == "Tan"
    assert new_user.email == "jane@example.com"
    assert new_user.user_role == "SME"
    assert new_user.password != "password123"

    assert result["message"] == "SME registered successfully"
    assert result["role"] == "SME"



def test_login_raises_when_user_not_found():
    db = FakeDB()
    db.set_query(user_module.User, first=None)

    with pytest.raises(HTTPException) as exc:
        user_module.login(
            data={"email": "missing@example.com", "password": "secret"},
            db=db,
        )

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid credentials"


def test_login_raises_when_password_invalid(monkeypatch):
    db = FakeDB()
    user = FakeUser(
        user_id="U1",
        email="john@example.com",
        password="stored-hash",
        user_role="SME",
    )
    db.set_query(user_module.User, first=user)

    monkeypatch.setattr(user_module, "verify_password", lambda plain, hashed: False)

    with pytest.raises(HTTPException) as exc:
        user_module.login(
            data={"email": "john@example.com", "password": "wrong"},
            db=db,
        )

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid credentials"


def test_login_returns_token_and_user_details(monkeypatch):
    db = FakeDB()
    user = FakeUser(
        user_id="U1",
        first_name="John",
        last_name="Doe",
        email="john@example.com",
        password="stored-hash",
        user_role="STAFF",
    )
    db.set_query(user_module.User, first=user)

    monkeypatch.setattr(user_module, "verify_password", lambda plain, hashed: True)
    monkeypatch.setattr(user_module, "create_access_token", lambda payload: "fake-jwt-token")

    result = user_module.login(
        data={"email": "john@example.com", "password": "correct"},
        db=db,
    )

    assert result["message"] == "Login successful"
    assert result["access_token"] == "fake-jwt-token"
    assert result["token_type"] == "bearer"
    assert result["user_id"] == "U1"
    assert result["role"] == "STAFF"
    assert result["first_name"] == "John"
    assert result["last_name"] == "Doe"
    assert result["email"] == "john@example.com"


def test_get_all_staff_returns_only_serialized_fields():
    db = FakeDB()
    staff_users = [
        FakeUser(user_id="S1", first_name="Alice", last_name="Lim", email="alice@example.com", user_role="STAFF"),
        FakeUser(user_id="S2", first_name="Bob", last_name="Ng", email="bob@example.com", user_role="STAFF"),
    ]
    db.set_query(user_module.User, all=staff_users)

    result = user_module.get_all_staff(
        db=db,
        current_user=STAFF_USER,
    )

    assert len(result) == 2
    assert result[0] == {
        "user_id": "S1",
        "first_name": "Alice",
        "last_name": "Lim",
        "email": "alice@example.com",
    }
    assert result[1]["user_id"] == "S2"


def test_get_all_sme_returns_only_serialized_fields():
    db = FakeDB()
    sme_users = [
        FakeUser(user_id="M1", first_name="Jane", last_name="Tan", email="jane@example.com", user_role="SME"),
    ]
    db.set_query(user_module.User, all=sme_users)

    result = user_module.get_all_sme(
        db=db,
        current_user=STAFF_USER,
    )

    assert len(result) == 1
    assert result[0] == {
        "user_id": "M1",
        "first_name": "Jane",
        "last_name": "Tan",
        "email": "jane@example.com",
    }


def test_get_all_staff_forbidden_for_sme():
    db = FakeDB()
    db.set_query(user_module.User, all=[])

    with pytest.raises(HTTPException) as exc:
        user_module.get_all_staff(
            db=db,
            current_user=SME_USER,
        )

    assert exc.value.status_code == 403
    assert exc.value.detail == "Forbidden"


def test_get_all_sme_forbidden_for_sme():
    db = FakeDB()
    db.set_query(user_module.User, all=[])

    with pytest.raises(HTTPException) as exc:
        user_module.get_all_sme(
            db=db,
            current_user=SME_USER,
        )

    assert exc.value.status_code == 403
    assert exc.value.detail == "Forbidden"

def test_create_staff_raises_when_email_exists():
    db = FakeDB()
    existing_user = FakeUser(email="staff@example.com")
    db.set_query(user_module.User, first=existing_user)

    payload = {
        "first_name": "Staff",
        "last_name": "User",
        "email": "staff@example.com",
        "password": "temp-pass",
    }

    with pytest.raises(HTTPException) as exc:
        user_module.create_staff(
            data=payload,
            db=db,
            current_user=MGMT_USER,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Email exists"


def test_create_staff_creates_staff_successfully():
    db = FakeDB()
    db.set_query(user_module.User, first=None)

    payload = {
        "first_name": "Alice",
        "last_name": "Reviewer",
        "email": "alice@example.com",
        "password": "temp-pass",
    }

    result = user_module.create_staff(
        data=payload,
        db=db,
        current_user=MGMT_USER,
    )

    assert db.committed is True
    assert len(db.added) == 1

    new_staff = db.added[0]
    assert new_staff.first_name == "Alice"
    assert new_staff.last_name == "Reviewer"
    assert new_staff.email == "alice@example.com"
    assert new_staff.user_role == "STAFF"
    assert new_staff.password != "temp-pass"

    assert result["message"] == "Staff created successfully"


def test_create_staff_forbidden_for_staff():
    db = FakeDB()
    db.set_query(user_module.User, first=None)

    payload = {
        "first_name": "Alice",
        "last_name": "Reviewer",
        "email": "alice@example.com",
        "password": "temp-pass",
    }

    with pytest.raises(HTTPException) as exc:
        user_module.create_staff(
            data=payload,
            db=db,
            current_user=STAFF_USER,
        )

    assert exc.value.status_code == 403
    assert exc.value.detail == "Forbidden"


def test_get_user_by_id_raises_when_missing():
    db = FakeDB()
    db.set_query(user_module.User, first=None)

    with pytest.raises(HTTPException) as exc:
        user_module.get_user_by_id(
            "missing-id",
            db=db,
            current_user=STAFF_USER,
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == "User not found"


def test_get_user_by_id_returns_serialized_user():
    db = FakeDB()
    user = FakeUser(
        user_id="U99",
        first_name="Test",
        last_name="User",
        email="test@example.com",
        user_role="SME",
    )
    db.set_query(user_module.User, first=user)

    result = user_module.get_user_by_id(
        "U99",
        db=db,
        current_user=STAFF_USER,
    )

    assert result == {
        "user_id": "U99",
        "first_name": "Test",
        "last_name": "User",
        "email": "test@example.com",
        "user_role": "SME",
    }


def test_get_user_by_id_allows_sme_to_view_own_profile():
    db = FakeDB()
    user = FakeUser(
        user_id="U1",
        first_name="John",
        last_name="Doe",
        email="john@example.com",
        user_role="SME",
    )
    db.set_query(user_module.User, first=user)

    result = user_module.get_user_by_id(
        "U1",
        db=db,
        current_user=SME_USER,
    )

    assert result["user_id"] == "U1"
    assert result["email"] == "john@example.com"


def test_get_user_by_id_forbidden_for_sme_viewing_other_profile():
    db = FakeDB()
    user = FakeUser(
        user_id="U99",
        first_name="Other",
        last_name="User",
        email="other@example.com",
        user_role="SME",
    )
    db.set_query(user_module.User, first=user)

    with pytest.raises(HTTPException) as exc:
        user_module.get_user_by_id(
            "U99",
            db=db,
            current_user=SME_USER,
        )

    assert exc.value.status_code == 403
    assert exc.value.detail == "Forbidden"