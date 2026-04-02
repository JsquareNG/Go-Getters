from datetime import datetime

from backend.models.user import User
from backend.models.application import ApplicationForm
from backend.models.bellNotifications import BellNotification


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


def seed_application(db_session, user_id):
    app = ApplicationForm(
        business_country="SG",
        business_name="Acme Pte Ltd",
        business_type="PRIVATE_LIMITED",
        previous_status=None,
        current_status="Draft",
        form_data={
            "country": "SG",
            "businessName": "Acme Pte Ltd",
            "businessType": "PRIVATE_LIMITED",
            "businessIndustry": "Technology",
        },
        user_id=user_id,
        provider_session_id=None,
    )
    db_session.add(app)
    db_session.commit()
    db_session.refresh(app)
    return app


def seed_notification(
    db_session,
    application_id,
    recipient_id,
    is_read=False,
):
    notif = BellNotification(
        application_id=application_id,
        recipient_id=recipient_id,
        from_status="Draft",
        to_status="Under Review",
        message="Status changed",
        is_read=is_read,
        created_at=datetime.utcnow(),
    )
    db_session.add(notif)
    db_session.commit()
    db_session.refresh(notif)
    return notif


def test_get_unread_notifications(client, db_session):
    user = seed_user(db_session, email="unread@example.com")

    app1 = seed_application(db_session, user.user_id)
    app2 = seed_application(db_session, user.user_id)
    app3 = seed_application(db_session, user.user_id)

    seed_notification(db_session, application_id=app1.application_id, recipient_id=user.user_id, is_read=False)
    seed_notification(db_session, application_id=app2.application_id, recipient_id=user.user_id, is_read=False)
    seed_notification(db_session, application_id=app3.application_id, recipient_id=user.user_id, is_read=True)

    response = client.get(f"/bell/unread/{user.user_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["notifications"]) == 2


def test_get_all_notifications(client, db_session):
    user = seed_user(db_session, email="all@example.com")

    app1 = seed_application(db_session, user.user_id)
    app2 = seed_application(db_session, user.user_id)

    seed_notification(db_session, application_id=app1.application_id, recipient_id=user.user_id, is_read=False)
    seed_notification(db_session, application_id=app2.application_id, recipient_id=user.user_id, is_read=True)

    response = client.get(f"/bell/all/{user.user_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert data["unread"] == 1
    assert len(data["notifications"]) == 2


def test_mark_one_read(client, db_session):
    user = seed_user(db_session, email="one@example.com")
    app = seed_application(db_session, user.user_id)

    seed_notification(
        db_session,
        application_id=app.application_id,
        recipient_id=user.user_id,
        is_read=False,
    )

    response = client.put(f"/bell/read-one/{app.application_id}")
    assert response.status_code == 200
    assert response.json() == {"message": "ok"}

    unread = client.get(f"/bell/unread/{user.user_id}").json()
    assert unread["total"] == 0


def test_mark_all_read(client, db_session):
    user = seed_user(db_session, email="allread@example.com")

    app1 = seed_application(db_session, user.user_id)
    app2 = seed_application(db_session, user.user_id)

    seed_notification(db_session, application_id=app1.application_id, recipient_id=user.user_id, is_read=False)
    seed_notification(db_session, application_id=app2.application_id, recipient_id=user.user_id, is_read=False)

    response = client.put(f"/bell/read-all/{user.user_id}")
    assert response.status_code == 200
    assert response.json() == {"message": "ok"}

    unread = client.get(f"/bell/unread/{user.user_id}").json()
    assert unread["total"] == 0