from __future__ import annotations

from typing import Any, Dict, List

from backend.services.cross_validation.normalizers import (
    normalize_address,
    normalize_business_name,
    normalize_date,
    normalize_entity_type,
    normalize_identifier,
    normalize_text,
)
from backend.services.cross_validation.utils import detect_document_type, get_attr, get_extracted_payload, is_empty
from backend.services.cross_validation.normalizers import normalize_document_data


def values_equivalent(field: str, left: Any, right: Any) -> bool:
    if is_empty(left) and is_empty(right):
        return True
    if is_empty(left) or is_empty(right):
        return False

    if field in {"registration_number", "tax_number", "bank_account_number"}:
        return normalize_identifier(left) == normalize_identifier(right)

    if field in {"business_name", "bank_account_holder_name"}:
        return normalize_business_name(left) == normalize_business_name(right)

    if field in {"registered_address"}:
        return normalize_address(left) == normalize_address(right)

    if field in {"registration_date", "resolution_date"}:
        return normalize_date(left) == normalize_date(right)

    if field in {"entity_type"}:
        return normalize_entity_type(left) == normalize_entity_type(right)

    return normalize_text(left) == normalize_text(right)


def build_finalized_rules_engine_payload(
    application_id: str,
    canonical_form: Dict[str, Any],
    documents: List[Any],
    document_results: List[Dict[str, Any]],
    cross_validation_result: Dict[str, Any],
) -> Dict[str, Any]:
    finalized_data: Dict[str, Any] = dict(canonical_form)
    field_sources: Dict[str, Dict[str, Any]] = {}
    conflicts: List[Dict[str, Any]] = []

    result_by_doc_id = {
        result.get("document_id"): result
        for result in document_results
    }

    for field, value in finalized_data.items():
        field_sources[field] = {
            "chosen_source": "FORM" if not is_empty(value) else None,
            "supporting_sources": [],
            "matched_sources": [],
            "warning_sources": [],
        }

    for doc in documents:
        doc_id = get_attr(doc, "document_id")
        doc_type = detect_document_type(doc)
        extracted = get_extracted_payload(doc)

        if not extracted:
            continue

        doc_result = result_by_doc_id.get(doc_id, {})
        upload_status = doc_result.get("upload_validation_status", "UNKNOWN")
        canonical_doc = normalize_document_data(doc_type, extracted)

        matched_doc_fields = {
            item["doc_field"]
            for item in doc_result.get("matches", [])
            if item.get("doc_field")
        }

        field_mapping = infer_doc_to_final_field_mapping(doc_type)

        for doc_field, doc_value in canonical_doc.items():
            if is_empty(doc_value):
                continue

            final_field = field_mapping.get(doc_field, doc_field)

            if final_field not in finalized_data:
                finalized_data[final_field] = doc_value
                field_sources[final_field] = {
                    "chosen_source": doc_type,
                    "supporting_sources": [doc_type],
                    "matched_sources": [doc_type] if doc_field in matched_doc_fields else [],
                    "warning_sources": [doc_type] if upload_status == "WARNING" else [],
                }
                continue

            existing_value = finalized_data.get(final_field)

            if is_empty(existing_value):
                finalized_data[final_field] = doc_value
                field_sources[final_field]["chosen_source"] = doc_type
            else:
                same_value = values_equivalent(final_field, existing_value, doc_value)
                if not same_value:
                    conflicts.append({
                        "field": final_field,
                        "existing_value": existing_value,
                        "new_value": doc_value,
                        "existing_source": field_sources[final_field].get("chosen_source"),
                        "new_source": doc_type,
                    })

            if doc_type not in field_sources[final_field]["supporting_sources"]:
                field_sources[final_field]["supporting_sources"].append(doc_type)

            if doc_field in matched_doc_fields and doc_type not in field_sources[final_field]["matched_sources"]:
                field_sources[final_field]["matched_sources"].append(doc_type)

            if upload_status == "WARNING" and doc_type not in field_sources[final_field]["warning_sources"]:
                field_sources[final_field]["warning_sources"].append(doc_type)

    return {
        "application_id": application_id,
        "finalized_data": finalized_data,
        "conflicts": conflicts,
    }


def infer_doc_to_final_field_mapping(doc_type: str) -> Dict[str, str]:
    if doc_type == "BANK_STATEMENT":
        return {
            "bank_account_holder_name": "bank_account_holder_name",
            "bank_account_number": "bank_account_number",
            "registered_address": "registered_address",
            "account_currency": "account_currency",
            "statement_period": "statement_period",
            "bank_name": "bank_name",
        }

    return {}