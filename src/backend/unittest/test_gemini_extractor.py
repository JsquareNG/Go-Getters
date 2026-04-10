import json
import pytest
import sys
from unittest.mock import patch, MagicMock

sys.modules["vertexai"] = MagicMock()
sys.modules["vertexai.generative_models"] = MagicMock()

from backend.services.gemini_extractor import (
    classify_document,
    parse_universal_document
)

from backend.models.extract import DOCUMENT_SCHEMA_REGISTRY


# -------------------------------------------------------------------
# Helper: Generate schema-valid mock data
# -------------------------------------------------------------------
def build_valid_mock_data(schema_class):
    schema = schema_class.model_json_schema()
    mock_data = {}

    for key, value in schema.get("properties", {}).items():
        field_type = value.get("type")

        if field_type == "string":
            # Special handling for known constrained fields
            if "nib" in key.lower():
                mock_data[key] = "1234567890123"  # 13-digit valid NIB
            else:
                mock_data[key] = "test"

        elif field_type == "array":
            mock_data[key] = []

        elif field_type == "object":
            mock_data[key] = {}

        elif field_type == "integer":
            mock_data[key] = 123

        elif field_type == "number":
            mock_data[key] = 123.45

        elif field_type == "boolean":
            mock_data[key] = False

        else:
            mock_data[key] = None

    return mock_data


# -------------------------------------------------------------------
# TEST: classify_document
# -------------------------------------------------------------------
@patch("backend.services.gemini_extractor.GenerativeModel")
def test_classify_document(mock_model_class):
    mock_model = MagicMock()

    mock_model.generate_content.return_value.text = "ACRA_BUSINESS_PROFILE"
    mock_model_class.return_value = mock_model

    result = classify_document("some ACRA text")

    assert result == "ACRA_BUSINESS_PROFILE"


@patch("backend.services.gemini_extractor.GenerativeModel")
def test_classify_document_fallback(mock_model_class):
    mock_model = MagicMock()

    mock_model.generate_content.return_value.text = "unknown"
    mock_model_class.return_value = mock_model

    result = classify_document("random text")

    assert result == "UNKNOWN"


# -------------------------------------------------------------------
# TEST: parse_universal_document (valid)
# -------------------------------------------------------------------
@patch("backend.services.gemini_extractor.GenerativeModel")
def test_parse_universal_document_valid(mock_model_class):
    mock_model = MagicMock()

    # Pick any valid document type
    doc_type = list(DOCUMENT_SCHEMA_REGISTRY.keys())[0]
    schema_class = DOCUMENT_SCHEMA_REGISTRY[doc_type]

    # Generate schema-valid mock response
    mock_data = build_valid_mock_data(schema_class)

    mock_model.generate_content.return_value.text = json.dumps(mock_data)
    mock_model_class.return_value = mock_model

    result = parse_universal_document(
        raw_text="dummy text",
        doc_type=doc_type
    )

    assert isinstance(result, dict)


# -------------------------------------------------------------------
# TEST: invalid doc type
# -------------------------------------------------------------------
def test_parse_universal_document_invalid_type():
    with pytest.raises(ValueError) as exc:
        parse_universal_document(
            raw_text="dummy text",
            doc_type="INVALID_TYPE"
        )

    assert "Unsupported document type" in str(exc.value)


# -------------------------------------------------------------------
# TEST: invalid JSON response
# -------------------------------------------------------------------
@patch("backend.services.gemini_extractor.GenerativeModel")
def test_parse_universal_document_invalid_json(mock_model_class):
    mock_model = MagicMock()

    mock_model.generate_content.return_value.text = "not-json"
    mock_model_class.return_value = mock_model

    doc_type = list(DOCUMENT_SCHEMA_REGISTRY.keys())[0]

    with pytest.raises(Exception):
        parse_universal_document(
            raw_text="dummy text",
            doc_type=doc_type
        )