import pytest
from fastapi import HTTPException

from backend.api.extract import (
    normalize_doc_type,
    _validate_file_type,
    _light_upload_validation,
    _resolve_universal_parse_doc_type,
)


# ==============================
# normalize_doc_type
# ==============================

def test_normalize_doc_type():
    assert normalize_doc_type("acra") == "ACRA"
    assert normalize_doc_type("ACRA_BUSINESS_PROFILE") == "ACRA"
    assert normalize_doc_type(None) == "UNKNOWN"


# ==============================
# validate_file_type
# ==============================

def test_validate_file_type_valid():
    _validate_file_type("application/pdf")


def test_validate_file_type_invalid():
    with pytest.raises(HTTPException):
        _validate_file_type("text/plain")


# ==============================
# light upload validation
# ==============================

def test_light_upload_validation_pass():
    result = _light_upload_validation(
        raw_text="ACRA BUSINESS PROFILE UEN 12345678A ENTITY NAME SAMPLE COMPANY PTE LTD",
        detected_doc_type="ACRA"
    )

    assert result["status"] in ["PASS", "WARNING"]


def test_light_upload_validation_fail_short():
    result = _light_upload_validation("short", "ACRA")

    assert result["status"] == "FAIL"


def test_light_upload_validation_mismatch():
    result = _light_upload_validation(
        raw_text="ACRA BUSINESS PROFILE UEN 12345678A ENTITY NAME SAMPLE COMPANY PTE LTD",
        detected_doc_type="ACRA",
        expected_doc_type="NIB"
    )

    assert result["status"] == "FAIL"
    assert result["expected_document_match"] is False


# ==============================
# resolve doc type
# ==============================

def test_resolve_doc_type_known(monkeypatch):
    monkeypatch.setattr(
        "backend.api.extract.DOCUMENT_SCHEMA_REGISTRY",
        {"ACRA": {}}
    )

    assert _resolve_universal_parse_doc_type("ACRA") == "ACRA"


def test_resolve_doc_type_unknown(monkeypatch):
    monkeypatch.setattr(
        "backend.api.extract.DOCUMENT_SCHEMA_REGISTRY",
        {}
    )

    assert _resolve_universal_parse_doc_type("XYZ") == "UNKNOWN"