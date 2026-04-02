from datetime import datetime, date, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import backend.api.liveness_detection as liveness_module


# ----------------------------
# Fakes / helpers
# ----------------------------

class FakeQuery:
    def __init__(self, first_result=None, all_result=None):
        self._first_result = first_result
        self._all_result = all_result or []

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
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


class FakeColumn:
    def __init__(self, name):
        self.name = name


class FakeTable:
    def __init__(self, columns):
        self.columns = [FakeColumn(c) for c in columns]


class FakeLivenessRow:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)
        self.__table__ = FakeTable(kwargs.keys())


def make_row(**overrides):
    base = {
        "id": 1,
        "application_id": "APP-1",
        "provider": "didit",
        "provider_session_id": "sess-123",
        "provider_session_number": "S-001",
        "workflow_id": "wf-123",
        "provider_session_url": "https://didit/session/123",
        "overall_status": "approved",
        "manual_review_required": False,
        "full_name": "John Doe",
        "document_type": "PASSPORT",
        "document_number": "A1234567",
        "document_number_masked": "A****567",
        "date_of_birth": date(1990, 1, 1),
        "gender": "M",
        "issuing_state_code": "SG",
        "formatted_address": "Singapore",
        "id_verification_status": "approved",
        "liveness_status": "approved",
        "liveness_score": 0.98,
        "face_match_status": "approved",
        "face_match_score": 0.95,
        "has_duplicate_identity_hit": False,
        "has_duplicate_face_hit": False,
        "risk_flags": [],
        "images": {"portrait_image_url": "https://public/portrait.jpg"},
        "created_at": datetime(2026, 3, 11, 9, 30, 42),
    }
    base.update(overrides)
    return FakeLivenessRow(**base)


# ----------------------------
# model_to_dict
# ----------------------------

def test_model_to_dict_formats_datetime_and_date():
    aware_dt = datetime(2026, 3, 11, 1, 30, 42, tzinfo=timezone.utc)
    row = make_row(
        created_at=aware_dt,
        date_of_birth=date(1990, 5, 20),
    )

    result = liveness_module.model_to_dict(row)

    assert result["created_at"] == "2026-03-11 09:30:42"
    assert result["date_of_birth"] == "1990-05-20"


def test_model_to_dict_keeps_non_date_values():
    row = make_row(full_name="Alice Tan", liveness_score=0.88)

    result = liveness_module.model_to_dict(row)

    assert result["full_name"] == "Alice Tan"
    assert result["liveness_score"] == 0.88


# ----------------------------
# parse_provider_created_at
# ----------------------------

def test_parse_provider_created_at_returns_none_when_missing():
    assert liveness_module.parse_provider_created_at(None) is None
    assert liveness_module.parse_provider_created_at("") is None


def test_parse_provider_created_at_parses_iso_zulu():
    dt = liveness_module.parse_provider_created_at("2026-03-11T09:30:42.745584Z")

    assert isinstance(dt, datetime)
    assert dt.year == 2026
    assert dt.month == 3
    assert dt.day == 11
    assert dt.tzinfo is not None


def test_parse_provider_created_at_raises_400_for_invalid_format():
    with pytest.raises(HTTPException) as exc:
        liveness_module.parse_provider_created_at("11/03/2026 09:30:42")

    assert exc.value.status_code == 400
    assert "Invalid created_at format" in exc.value.detail


# ----------------------------
# get by session id
# ----------------------------

def test_get_liveness_detection_by_session_id_returns_serialized_row():
    db = FakeDB()
    row = make_row(provider_session_id="sess-999")
    db.set_query(liveness_module.LivenessDetection, first=row)

    result = liveness_module.get_liveness_detection_by_session_id("sess-999", db=db)

    assert result["provider_session_id"] == "sess-999"
    assert result["application_id"] == "APP-1"


def test_get_liveness_detection_by_session_id_raises_404_when_missing():
    db = FakeDB()
    db.set_query(liveness_module.LivenessDetection, first=None)

    with pytest.raises(HTTPException) as exc:
        liveness_module.get_liveness_detection_by_session_id("missing", db=db)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Liveness detection record not found"


# ----------------------------
# create_liveness_detection
# ----------------------------

def test_create_liveness_detection_requires_provider_session_id():
    db = FakeDB()

    with pytest.raises(HTTPException) as exc:
        liveness_module.create_liveness_detection(data={}, db=db)

    assert exc.value.status_code == 400
    assert exc.value.detail == "provider_session_id is required"


def test_create_liveness_detection_rejects_duplicate_provider_session_id():
    db = FakeDB()
    existing = make_row(provider_session_id="sess-123")
    db.set_query(liveness_module.LivenessDetection, first=existing)

    with pytest.raises(HTTPException) as exc:
        liveness_module.create_liveness_detection(
            data={"provider_session_id": "sess-123"},
            db=db,
        )

    assert exc.value.status_code == 400
    assert "already exists" in exc.value.detail


def test_create_liveness_detection_uses_application_id_as_storage_reference(monkeypatch):
    db = FakeDB()
    db.set_query(liveness_module.LivenessDetection, first=None)

    captured_refs = []

    def fake_upload(url, kyc_ref, kind, ext):
        captured_refs.append((url, kyc_ref, kind, ext))
        return f"https://public/{kyc_ref}/{kind}{ext}"

    monkeypatch.setattr(
        liveness_module,
        "download_upload_and_get_kyc_public_url",
        fake_upload,
    )

    payload = {
        "provider_session_id": "sess-123",
        "application_id": "APP-999",
        "provider": "didit",
        "images": {
            "portrait_image_url": "https://remote/portrait.jpg",
            "front_image_url": "https://remote/front.jpg",
        },
        "created_at": "2026-03-11T09:30:42.745584Z",
    }

    result = liveness_module.create_liveness_detection(data=payload, db=db)

    assert db.committed is True
    assert len(db.added) == 1
    assert result["message"] == "Liveness detection record created successfully"

    assert captured_refs[0][1] == "APP-999"
    assert captured_refs[1][1] == "APP-999"

    stored = db.added[0]
    assert stored.application_id == "APP-999"
    assert stored.provider_session_id == "sess-123"
    assert stored.images["portrait_image_url"] == "https://public/APP-999/portrait.jpg"
    assert stored.images["front_image_url"] == "https://public/APP-999/front.jpg"


def test_create_liveness_detection_falls_back_to_session_id_as_storage_reference(monkeypatch):
    db = FakeDB()
    db.set_query(liveness_module.LivenessDetection, first=None)

    captured_refs = []

    def fake_upload(url, kyc_ref, kind, ext):
        captured_refs.append((url, kyc_ref, kind, ext))
        return f"https://public/{kyc_ref}/{kind}{ext}"

    monkeypatch.setattr(
        liveness_module,
        "download_upload_and_get_kyc_public_url",
        fake_upload,
    )

    payload = {
        "provider_session_id": "sess-abc",
        "provider": "didit",
        "images": {
            "portrait_image_url": "https://remote/portrait.jpg",
        },
    }

    liveness_module.create_liveness_detection(data=payload, db=db)

    assert captured_refs[0][1] == "sess-abc"


def test_create_liveness_detection_calls_media_conversion_for_all_expected_keys(monkeypatch):
    db = FakeDB()
    db.set_query(liveness_module.LivenessDetection, first=None)

    calls = []

    def fake_upload(url, kyc_ref, kind, ext):
        calls.append((url, kyc_ref, kind, ext))
        return f"https://public/{kind}{ext}"

    monkeypatch.setattr(
        liveness_module,
        "download_upload_and_get_kyc_public_url",
        fake_upload,
    )

    payload = {
        "provider_session_id": "sess-1",
        "application_id": "APP-1",
        "images": {
            "portrait_image_url": "u1",
            "front_image_url": "u2",
            "back_image_url": "u3",
            "full_front_pdf_url": "u4",
            "full_back_pdf_url": "u5",
            "liveness_reference_image_url": "u6",
            "liveness_video_url": "u7",
            "face_match_source_image_url": "u8",
            "face_match_target_image_url": "u9",
        },
    }

    liveness_module.create_liveness_detection(data=payload, db=db)

    expected = {
        ("u1", "APP-1", "portrait", ".jpg"),
        ("u2", "APP-1", "front", ".jpg"),
        ("u3", "APP-1", "back", ".jpg"),
        ("u4", "APP-1", "full_front", ".pdf"),
        ("u5", "APP-1", "full_back", ".pdf"),
        ("u6", "APP-1", "liveness_reference", ".jpg"),
        ("u7", "APP-1", "liveness_video", ".mp4"),
        ("u8", "APP-1", "face_match_source", ".jpg"),
        ("u9", "APP-1", "face_match_target", ".jpg"),
    }

    assert set(calls) == expected


def test_create_liveness_detection_sets_defaults_and_parsed_created_at(monkeypatch):
    db = FakeDB()
    db.set_query(liveness_module.LivenessDetection, first=None)

    monkeypatch.setattr(
        liveness_module,
        "download_upload_and_get_kyc_public_url",
        lambda url, kyc_ref, kind, ext: f"https://public/{kind}{ext}",
    )

    payload = {
        "provider_session_id": "sess-defaults",
        "provider": "didit",
        "images": {},
        "created_at": "2026-03-11T09:30:42.745584Z",
    }

    liveness_module.create_liveness_detection(data=payload, db=db)

    stored = db.added[0]
    assert stored.manual_review_required is False
    assert stored.has_duplicate_identity_hit is False
    assert stored.has_duplicate_face_hit is False
    assert stored.risk_flags == []
    assert isinstance(stored.created_at, datetime)


# ----------------------------
# update by session id
# ----------------------------

def test_update_liveness_detection_by_session_id_updates_application_id():
    db = FakeDB()
    row = make_row(application_id=None, provider_session_id="sess-update")
    db.set_query(liveness_module.LivenessDetection, first=row)

    result = liveness_module.update_liveness_detection_by_session_id(
        "sess-update",
        data={"application_id": "APP-NEW"},
        db=db,
    )

    assert db.committed is True
    assert row.application_id == "APP-NEW"
    assert result["message"] == "Liveness detection record updated successfully"
    assert result["data"]["application_id"] == "APP-NEW"


def test_update_liveness_detection_by_session_id_raises_404_when_missing():
    db = FakeDB()
    db.set_query(liveness_module.LivenessDetection, first=None)

    with pytest.raises(HTTPException) as exc:
        liveness_module.update_liveness_detection_by_session_id(
            "missing",
            data={"application_id": "APP-NEW"},
            db=db,
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == "Liveness detection record not found"


# ----------------------------
# get by application id
# ----------------------------

def test_get_liveness_detection_by_application_id_returns_latest_serialized_row():
    db = FakeDB()
    row = make_row(application_id="APP-X")
    db.set_query(liveness_module.LivenessDetection, first=row)

    result = liveness_module.get_liveness_detection_by_application_id("APP-X", db=db)

    assert result["application_id"] == "APP-X"
    assert result["provider_session_id"] == "sess-123"


def test_get_liveness_detection_by_application_id_raises_404_when_missing():
    db = FakeDB()
    db.set_query(liveness_module.LivenessDetection, first=None)

    with pytest.raises(HTTPException) as exc:
        liveness_module.get_liveness_detection_by_application_id("APP-MISSING", db=db)

    assert exc.value.status_code == 404
    assert "application_id" in exc.value.detail


# ----------------------------
# get all
# ----------------------------

def test_get_all_liveness_detections_returns_serialized_rows():
    db = FakeDB()
    rows = [
        make_row(application_id="APP-1", provider_session_id="sess-1"),
        make_row(application_id="APP-2", provider_session_id="sess-2"),
    ]
    db.set_query(liveness_module.LivenessDetection, all=rows)

    result = liveness_module.get_all_liveness_detections(db=db)

    assert len(result) == 2
    assert result[0]["application_id"] == "APP-1"
    assert result[1]["provider_session_id"] == "sess-2"


def test_get_all_liveness_detections_accepts_from_and_to_date_filters():
    db = FakeDB()
    rows = [make_row(application_id="APP-1")]
    db.set_query(liveness_module.LivenessDetection, all=rows)

    result = liveness_module.get_all_liveness_detections(
        from_date="2026-03-01",
        to_date="2026-03-31",
        db=db,
    )

    assert len(result) == 1
    assert result[0]["application_id"] == "APP-1"