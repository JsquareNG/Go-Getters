from datetime import datetime

from backend.models.user import User
from backend.models.application import ApplicationForm
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


def seed_application(db_session, user_id=TEST_USER_ID):
    app = ApplicationForm(
        business_country="SG",
        business_name="Acme Pte Ltd",
        business_type="PRIVATE_LIMITED",
        user_id=user_id,
        form_data={
            "country": "SG",
            "businessName": "Acme Pte Ltd",
            "businessType": "PRIVATE_LIMITED",
            "businessIndustry": "Technology",
        },
        previous_status=None,
        current_status="Draft",
    )
    db_session.add(app)
    db_session.commit()
    db_session.refresh(app)
    return app


def seed_notification(
    db_session,
    application_id,
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
    app1 = seed_application(db_session)
    app2 = seed_application(db_session)
    app3 = seed_application(db_session)

    seed_notification(db_session, application_id=app1.application_id, recipient_id=TEST_USER_ID, is_read=False)
    seed_notification(db_session, application_id=app2.application_id, recipient_id=TEST_USER_ID, is_read=False)
    seed_notification(db_session, application_id=app3.application_id, recipient_id=TEST_USER_ID, is_read=True)

    response = client.get(f"/bell/unread/{TEST_USER_ID}")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["notifications"]) == 2


def test_get_all_notifications(client, db_session):
    seed_user(db_session)
    app1 = seed_application(db_session)
    app2 = seed_application(db_session)

    seed_notification(db_session, application_id=app1.application_id, recipient_id=TEST_USER_ID, is_read=False)
    seed_notification(db_session, application_id=app2.application_id, recipient_id=TEST_USER_ID, is_read=True)

    response = client.get(f"/bell/all/{TEST_USER_ID}")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert data["unread"] == 1
    assert len(data["notifications"]) == 2


def test_mark_one_read(client, db_session):
    seed_user(db_session)
    app = seed_application(db_session)
    seed_notification(db_session, application_id=app.application_id, recipient_id=TEST_USER_ID, is_read=False)

    response = client.put(f"/bell/read-one/{app.application_id}")
    assert response.status_code == 200
    assert response.json() == {"message": "ok"}

    unread = client.get(f"/bell/unread/{TEST_USER_ID}").json()
    assert unread["total"] == 0


def test_mark_all_read(client, db_session):
    seed_user(db_session)
    app1 = seed_application(db_session)
    app2 = seed_application(db_session)

    seed_notification(db_session, application_id=app1.application_id, recipient_id=TEST_USER_ID, is_read=False)
    seed_notification(db_session, application_id=app2.application_id, recipient_id=TEST_USER_ID, is_read=False)

    response = client.put(f"/bell/read-all/{TEST_USER_ID}")
    assert response.status_code == 200
    assert response.json() == {"message": "ok"}

    unread = client.get(f"/bell/unread/{TEST_USER_ID}").json()
    assert unread["total"] == 0