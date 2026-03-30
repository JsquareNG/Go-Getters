from types import SimpleNamespace

import backend.api.bellNotification as bell_module


class FakeQuery:
    def __init__(self, all_result=None, scalar_result=None):
        self._all_result = all_result or []
        self._scalar_result = scalar_result
        self.updated_with = None

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def all(self):
        return self._all_result

    def scalar(self):
        return self._scalar_result

    def update(self, values, synchronize_session=False):
        self.updated_with = {
            "values": values,
            "synchronize_session": synchronize_session,
        }
        return 1


class FakeDB:
    def __init__(self):
        self.query_calls = []
        self.queries = []
        self.committed = False

    def add_query(self, query_obj):
        self.queries.append(query_obj)

    def query(self, *args, **kwargs):
        self.query_calls.append(args)
        return self.queries.pop(0)

    def commit(self):
        self.committed = True


def make_notification(
    id=1,
    application_id="APP-1",
    recipient_id="USER-1",
    from_status="Draft",
    to_status="Under Review",
    message="Status changed",
    is_read=False,
    created_at="2026-03-30T10:00:00Z",
):
    return SimpleNamespace(
        id=id,
        application_id=application_id,
        recipient_id=recipient_id,
        from_status=from_status,
        to_status=to_status,
        message=message,
        is_read=is_read,
        created_at=created_at,
    )


def test_notif_to_dict():
    notif = make_notification()

    result = bell_module._notif_to_dict(notif)

    assert result == {
        "notification_id": "1",
        "application_id": "APP-1",
        "recipient_id": "USER-1",
        "from_status": "Draft",
        "to_status": "Under Review",
        "message": "Status changed",
        "is_read": False,
        "created_at": "2026-03-30T10:00:00Z",
    }


def test_get_unread_notifications_returns_total_and_notifications():
    db = FakeDB()
    notifications = [
        make_notification(id=1, is_read=False),
        make_notification(id=2, application_id="APP-2", is_read=False),
    ]
    db.add_query(FakeQuery(all_result=notifications))

    result = bell_module.get_unread_notifications("USER-1", db=db)

    assert result["total"] == 2
    assert len(result["notifications"]) == 2
    assert result["notifications"][0]["notification_id"] == "1"
    assert result["notifications"][1]["application_id"] == "APP-2"


def test_get_unread_notifications_returns_empty_list_when_none():
    db = FakeDB()
    db.add_query(FakeQuery(all_result=[]))

    result = bell_module.get_unread_notifications("USER-1", db=db)

    assert result == {
        "total": 0,
        "notifications": [],
    }


def test_get_all_notifications_returns_total_unread_and_notifications():
    db = FakeDB()
    notifications = [
        make_notification(id=1, is_read=False),
        make_notification(id=2, application_id="APP-2", is_read=True),
    ]

    db.add_query(FakeQuery(all_result=notifications))
    db.add_query(FakeQuery(scalar_result=5))

    result = bell_module.get_all_notifications("USER-1", db=db)

    assert result["total"] == 2
    assert result["unread"] == 5
    assert len(result["notifications"]) == 2
    assert result["notifications"][0]["notification_id"] == "1"


def test_mark_one_read_updates_and_commits():
    db = FakeDB()
    query = FakeQuery()
    db.add_query(query)

    result = bell_module.mark_one_read("APP-1", db=db)

    assert query.updated_with == {
        "values": {"is_read": True},
        "synchronize_session": False,
    }
    assert db.committed is True
    assert result == {"message": "ok"}


def test_mark_all_read_updates_and_commits():
    db = FakeDB()
    query = FakeQuery()
    db.add_query(query)

    result = bell_module.mark_all_read("USER-1", db=db)

    assert query.updated_with == {
        "values": {"is_read": True},
        "synchronize_session": False,
    }
    assert db.committed is True
    assert result == {"message": "ok"}