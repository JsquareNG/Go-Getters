import json
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.modules["vertexai"] = MagicMock()
sys.modules["vertexai.generative_models"] = MagicMock()

from backend.services.gemini_extractor import (
    classify_document,
    parse_universal_document,
)
from backend.models.extract import DOCUMENT_SCHEMA_REGISTRY


@patch("backend.services.gemini_extractor.GenerativeModel")
def test_classify_acra(mock_model_class):
    mock_model = MagicMock()
    mock_model.generate_content.return_value.text = "ACRA"
    mock_model_class.return_value = mock_model

    result = classify_document("ACCOUNTING AND CORPORATE REGULATORY AUTHORITY")

    assert result == "ACRA"


@patch("backend.services.gemini_extractor.GenerativeModel")
def test_classify_nib(mock_model_class):
    mock_model = MagicMock()
    mock_model.generate_content.return_value.text = "NIB"
    mock_model_class.return_value = mock_model

    result = classify_document("Nomor Induk Berusaha")

    assert result == "NIB"


@patch("backend.services.gemini_extractor.GenerativeModel")
def test_classify_unknown(mock_model_class):
    mock_model = MagicMock()
    mock_model.generate_content.return_value.text = "UNKNOWN"
    mock_model_class.return_value = mock_model

    result = classify_document("some random unreadable text")

    assert result == "UNKNOWN"


@patch("backend.services.gemini_extractor.GenerativeModel")
def test_classify_trims_and_uppercases(mock_model_class):
    mock_model = MagicMock()
    mock_model.generate_content.return_value.text = "  acra  "
    mock_model_class.return_value = mock_model

    result = classify_document("some text")

    assert result == "ACRA"


@patch("backend.services.gemini_extractor.GenerativeModel")
def test_classify_large_input_truncation(mock_model_class):
    mock_model = MagicMock()
    mock_model.generate_content.return_value.text = "NIB"
    mock_model_class.return_value = mock_model

    long_text = "A" * 10000
    result = classify_document(long_text)

    assert result == "NIB"
    mock_model.generate_content.assert_called_once()



@patch("backend.services.gemini_extractor.GenerativeModel")
def test_parse_universal_document_acra_valid(mock_model_class):
    mock_model = MagicMock()

    mock_json = {
        "businessName": "Test Company Pte Ltd",
        "uen": "123456789A",
        "entityType": "PRIVATE LIMITED",
        "registrationDate": "01-01-2024",
        "registeredAddress": "123 Test Street, Singapore",
        "businessIndustry": "Software Development",
        "owner": None,
        "partners": [],
        "generalPartners": [],
        "limitedPartners": [],
        "managers": [],
        "directors": [],
        "shareholders": [],
    }

    mock_model.generate_content.return_value.text = json.dumps(mock_json)
    mock_model_class.return_value = mock_model

    result = parse_universal_document(
        raw_text="dummy OCR text",
        doc_type="ACRA",
    )

    assert result["businessName"] == "Test Company Pte Ltd"
    assert result["uen"] == "123456789A"
    assert result["entityType"] == "PRIVATE LIMITED"


def test_parse_universal_document_invalid_doc_type():
    with pytest.raises(ValueError) as exc:
        parse_universal_document(
            raw_text="dummy OCR text",
            doc_type="INVALID_TYPE",
        )

    assert "Unsupported document type" in str(exc.value)


@patch("backend.services.gemini_extractor.GenerativeModel")
def test_parse_universal_document_invalid_json(mock_model_class):
    mock_model = MagicMock()
    mock_model.generate_content.return_value.text = "NOT VALID JSON"
    mock_model_class.return_value = mock_model

    with pytest.raises(Exception):
        parse_universal_document(
            raw_text="dummy OCR text",
            doc_type="ACRA",
        )


@patch("backend.services.gemini_extractor.GenerativeModel")
def test_parse_universal_document_missing_required_fields(mock_model_class):
    mock_model = MagicMock()
    mock_model.generate_content.return_value.text = "{}"
    mock_model_class.return_value = mock_model

    with pytest.raises(Exception):
        parse_universal_document(
            raw_text="dummy OCR text",
            doc_type="ACRA",
        )


@patch("backend.services.gemini_extractor.GenerativeModel")
def test_parse_universal_document_nib_valid(mock_model_class):
    mock_model = MagicMock()

    mock_json = {
        "businessName": "PT Maju Jaya",
        "registrationNumber": "1234567890123",
        "businessStatus": "PMDN",
        "registeredAddress": "Jakarta, Indonesia",
        "kbliCodes": ["62010"],
        "phone": "",
        "email": "",
        "registrationDate": "01-01-2024",
        "issuer": "BKPM",
        "businessActivities": [],
    }

    mock_model.generate_content.return_value.text = json.dumps(mock_json)
    mock_model_class.return_value = mock_model

    result = parse_universal_document(
        raw_text="dummy OCR text",
        doc_type="NIB",
    )

    assert result["businessName"] == "PT Maju Jaya"
    assert result["registrationNumber"] == "1234567890123"
    assert result["kbliCodes"] == ["62010"]


@patch("backend.services.gemini_extractor.GenerativeModel")
def test_parse_universal_document_unknown_valid(mock_model_class):
    mock_model = MagicMock()

    mock_json = {
        "requestedDocumentName": "",
        "matchedRequestedDocument": True,
        "detectedDocumentType": "UNKNOWN",
        "documentPurposeSummary": "Unsupported document",
        "keyEntities": {},
        "keyIdentifiers": {},
        "importantDates": {},
        "addresses": {},
        "financialInformation": {},
        "ownershipAndGovernance": {},
        "obligationsAndTerms": {},
        "extractedMappedFields": {},
        "missingOrUnclearItems": [],
    }

    mock_model.generate_content.return_value.text = json.dumps(mock_json)
    mock_model_class.return_value = mock_model

    result = parse_universal_document(
        raw_text="dummy OCR text",
        doc_type="UNKNOWN",
    )

    assert result["detectedDocumentType"] == "UNKNOWN"
    assert isinstance(result["missingOrUnclearItems"], list)


def test_document_schema_registry_contains_expected_keys():
    assert "ACRA" in DOCUMENT_SCHEMA_REGISTRY
    assert "NIB" in DOCUMENT_SCHEMA_REGISTRY
    assert "UNKNOWN" in DOCUMENT_SCHEMA_REGISTRY