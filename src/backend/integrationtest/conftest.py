import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import app
from backend.database import get_db
from backend.database import Base
from backend.auth.dependencies import get_current_user

# Import models so metadata is registered
from backend.models.user import User
from backend.models.application import ApplicationForm
from backend.models.bellNotifications import BellNotification
from backend.models.reviewJobs import ReviewJobs
from backend.models.liveness_detection import LivenessDetection
from backend.models.action_requests import ActionRequest, ActionRequestItem

TEST_DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def _apply_common_monkeypatches(monkeypatch):
    monkeypatch.setattr("backend.api.application.add_bell", lambda **kwargs: None, raising=False)
    monkeypatch.setattr("backend.api.application.create_audit_log", lambda **kwargs: None, raising=False)
    monkeypatch.setattr("backend.api.application.send_email", lambda *args, **kwargs: None, raising=False)
    monkeypatch.setattr("backend.api.application.run_review_job", lambda *args, **kwargs: None, raising=False)


@pytest.fixture
def client(monkeypatch):
    """
    Default authenticated SME client.
    Use this for SME-owned flows like:
    - applications firstSave / firstSubmit / withdraw
    - bell notifications for own recipient_id
    """
    _apply_common_monkeypatches(monkeypatch)

    def override_get_current_user():
        return {
            "user_id": "00000001",
            "role": "SME",
        }

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def staff_client(monkeypatch):
    """
    Authenticated STAFF client.
    Use this for staff-only/internal endpoints like:
    - /reviewJobs/*
    - audit metrics if you test them later
    """
    _apply_common_monkeypatches(monkeypatch)

    def override_get_current_user():
        return {
            "user_id": "STAFF-0001",
            "role": "STAFF",
        }

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def management_client(monkeypatch):
    """
    Authenticated MANAGEMENT client.
    Use this for management-only endpoints if needed later.
    """
    _apply_common_monkeypatches(monkeypatch)

    def override_get_current_user():
        return {
            "user_id": "MGMT-0001",
            "role": "MANAGEMENT",
        }

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()