from datetime import datetime

from backend.models.user import User
from backend.models.bellNotifications import BellNotification

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


def seed_notification(
    db_session,
    application_id="APP-1",
    recipient_id=TEST_USER_ID,
    from_status="Draft",
    to_status="Under Review",
    message="Status changed",
    is_read=False,
):
    notif = BellNotification(
        application_id=application_id,
        recipient_id=recipient_id,
        from_status=from_status,
        to_status=to_status,
        message=message,
        is_read=is_read,
        created_at=datetime.utcnow(),
    )
    db_session.add(notif)
    db_session.commit()
    db_session.refresh(notif)
    return notif


def test_get_unread_notifications(client, db_session):
    seed_user(db_session)
    seed_notification(db_session, application_id="APP-1", recipient_id=TEST_USER_ID, is_read=False)
    seed_notification(db_session, application_id="APP-2", recipient_id=TEST_USER_ID, is_read=False)
    seed_notification(db_session, application_id="APP-3", recipient_id=TEST_USER_ID, is_read=True)

    response = client.get(f"/bell/unread/{TEST_USER_ID}")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["notifications"]) == 2


def test_get_all_notifications(client, db_session):
    seed_user(db_session)
    seed_notification(db_session, application_id="APP-1", recipient_id=TEST_USER_ID, is_read=False)
    seed_notification(db_session, application_id="APP-2", recipient_id=TEST_USER_ID, is_read=True)

    response = client.get(f"/bell/all/{TEST_USER_ID}")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert data["unread"] == 1
    assert len(data["notifications"]) == 2


def test_mark_one_read(client, db_session):
    seed_user(db_session)
    seed_notification(db_session, application_id="APP-1", recipient_id=TEST_USER_ID, is_read=False)

    response = client.put("/bell/read-one/APP-1")
    assert response.status_code == 200
    assert response.json() == {"message": "ok"}

    unread = client.get(f"/bell/unread/{TEST_USER_ID}").json()
    assert unread["total"] == 0


def test_mark_all_read(client, db_session):
    seed_user(db_session)
    seed_notification(db_session, application_id="APP-1", recipient_id=TEST_USER_ID, is_read=False)
    seed_notification(db_session, application_id="APP-2", recipient_id=TEST_USER_ID, is_read=False)

    response = client.put(f"/bell/read-all/{TEST_USER_ID}")
    assert response.status_code == 200
    assert response.json() == {"message": "ok"}

    unread = client.get(f"/bell/unread/{TEST_USER_ID}").json()
    assert unread["total"] == 0