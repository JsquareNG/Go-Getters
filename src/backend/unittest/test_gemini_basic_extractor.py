import pytest
import sys
from unittest.mock import patch, MagicMock

sys.modules["vertexai"] = MagicMock()
sys.modules["vertexai.generative_models"] = MagicMock()

from backend.services.gemini_basic_extractor import (
    classify_business_document,
    parse_basic_info_document,
)
from backend.models.basic_extract import BASIC_INFO_SCHEMA_REGISTRY

# -----------------------------
# TEST: classify_business_document
# -----------------------------

@patch("backend.services.gemini_basic_extractor.GenerativeModel")
def test_classify_acra(mock_model_class):
    mock_model = MagicMock()
    mock_model.generate_content.return_value.text = "ACRA"
    mock_model_class.return_value = mock_model

    result = classify_business_document("ACRA document text")

    assert result == "ACRA"


@patch("backend.services.gemini_basic_extractor.GenerativeModel")
def test_classify_nib(mock_model_class):
    mock_model = MagicMock()
    mock_model.generate_content.return_value.text = "NIB"
    mock_model_class.return_value = mock_model

    result = classify_business_document("NIB document text")

    assert result == "NIB"


@patch("backend.services.gemini_basic_extractor.GenerativeModel")
def test_classify_invalid_fallback(mock_model_class):
    mock_model = MagicMock()
    mock_model.generate_content.return_value.text = "INVALID OUTPUT"
    mock_model_class.return_value = mock_model

    result = classify_business_document("random text")

    assert result == "UNKNOWN"


# -----------------------------
# TEST: parse_basic_info_document
# -----------------------------

@patch("backend.services.gemini_basic_extractor.GenerativeModel")
def test_parse_basic_info_valid(mock_model_class):
    mock_model = MagicMock()

    import json

    mock_json = {
        "business_name": "Test Company",
        "uen": "123456789",

        # FIX: correct types
        "owner": {},
        "partners": [],
        "general_partners": [],
        "limited_partners": [],
        "managers": [],
        "directors": [],
        "shareholders": [],

        "additional_data": {}
    }

    mock_model.generate_content.return_value.text = json.dumps(mock_json)
    mock_model_class.return_value = mock_model

    result = parse_basic_info_document(
        raw_text="dummy text",
        doc_type="ACRA"
    )

    assert result["business_name"] == "Test Company"
    assert result["uen"] == "123456789"


def test_parse_basic_info_invalid_doc_type():
    with pytest.raises(ValueError) as exc:
        parse_basic_info_document(
            raw_text="text",
            doc_type="INVALID"
        )

    assert "Unsupported basic info document type" in str(exc.value)


@patch("backend.services.gemini_basic_extractor.GenerativeModel")
def test_parse_basic_info_invalid_json(mock_model_class):
    mock_model = MagicMock()
    mock_model.generate_content.return_value.text = "NOT VALID JSON"
    mock_model_class.return_value = mock_model

    with pytest.raises(Exception):
        parse_basic_info_document(
            raw_text="dummy text",
            doc_type="ACRA"
        )


@patch("backend.services.gemini_basic_extractor.GenerativeModel")
def test_parse_basic_info_missing_fields(mock_model_class):
    mock_model = MagicMock()

    # Return incomplete JSON (should still validate or fail depending on schema strictness)
    mock_model.generate_content.return_value.text = "{}"
    mock_model_class.return_value = mock_model

    result = parse_basic_info_document(
        raw_text="dummy text",
        doc_type="ACRA"
    )

    # Should return a dict, even if empty/default
    assert isinstance(result, dict)


# -----------------------------
# EDGE CASES
# -----------------------------

@patch("backend.services.gemini_basic_extractor.GenerativeModel")
def test_classify_trims_and_uppercases(mock_model_class):
    mock_model = MagicMock()
    mock_model.generate_content.return_value.text = "  acra  "
    mock_model_class.return_value = mock_model

    result = classify_business_document("text")

    assert result == "ACRA"


@patch("backend.services.gemini_basic_extractor.GenerativeModel")
def test_classify_large_input_truncation(mock_model_class):
    mock_model = MagicMock()
    mock_model.generate_content.return_value.text = "NIB"
    mock_model_class.return_value = mock_model

    long_text = "A" * 10000  # exceeds prompt limit

    result = classify_business_document(long_text)

    assert result == "NIB"
    # Ensure prompt truncation doesn't crash
    mock_model.generate_content.assert_called_once()