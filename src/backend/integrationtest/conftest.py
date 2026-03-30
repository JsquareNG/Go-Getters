import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import app
from backend.database import get_db
from backend.database import Base

# Import models so metadata is registered
from backend.models.user import User
from backend.models.application import ApplicationForm
from backend.models.bellNotifications import BellNotification
from backend.models.reviewJobs import ReviewJobs

TEST_DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


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


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr("backend.api.application.add_bell", lambda **kwargs: None, raising=False)
    monkeypatch.setattr("backend.api.application.create_audit_log", lambda **kwargs: None, raising=False)
    monkeypatch.setattr("backend.api.application.send_email", lambda *args, **kwargs: None, raising=False)
    monkeypatch.setattr("backend.api.application.run_review_job", lambda *args, **kwargs: None, raising=False)

    with TestClient(app) as c:
        yield c