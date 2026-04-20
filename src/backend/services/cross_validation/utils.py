from __future__ import annotations

from typing import Any, Dict


def get_attr(obj: Any, key: str, default: Any = None) -> Any:
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def is_empty(value: Any) -> bool:
    return value in (None, "", [], {})


def extract_effective_form_data(form_data: Dict[str, Any]) -> Dict[str, Any]:
    nested = form_data.get("form_data")
    if isinstance(nested, dict) and nested:
        return nested
    return form_data


def get_extracted_payload(doc: Any) -> Dict[str, Any]:
    if isinstance(doc, dict):
        extracted = doc.get("extracted_data")
        if isinstance(extracted, dict):
            return extracted

        if "data" in doc or "upload_validation" in doc or "classified_as" in doc:
            return doc

        return {}

    if hasattr(doc, "extracted_data") and isinstance(doc.extracted_data, dict):
        return doc.extracted_data or {}

    if hasattr(doc, "ocr_data") and isinstance(doc.ocr_data, dict):
        return doc.ocr_data or {}

    return {}


def detect_document_type(doc: Any) -> str:
    extracted = get_extracted_payload(doc)

    possible_values = [
        extracted.get("classified_as") if isinstance(extracted, dict) else None,
        extracted.get("document_type") if isinstance(extracted, dict) else None,
        extracted.get("detectedType") if isinstance(extracted, dict) else None,
        get_attr(doc, "detected_type"),
        get_attr(doc, "document_type"),
    ]

    aliases = {
        "ACRA_BUSINESS_PROFILE": "ACRA",
        "BUSINESSPROFILE": "ACRA",
        "BUSINESS_PROFILE": "ACRA",
        "BANKSTATEMENT": "BANK_STATEMENT",
        "BANK_STATEMENT": "BANK_STATEMENT",
        "NPWPCERTIFICATE": "NPWP_CERTIFICATE",
        "NPWP_CERTIFICATE": "NPWP_CERTIFICATE",
        "BOARDRESOLUTION": "BOARD_RESOLUTION",
        "BOARD_RESOLUTION": "BOARD_RESOLUTION",
        "LLPRESOLUTION": "LLP_RESOLUTION",
        "LLP_RESOLUTION": "LLP_RESOLUTION",
        "OFFICELEASE": "OFFICE_LEASE",
        "OFFICE_LEASE": "OFFICE_LEASE",
        "TENANCYAGREEMENT": "TENANCY_AGREEMENT",
        "TENANCY_AGREEMENT": "TENANCY_AGREEMENT",
        "AKTAPENDIRIAN": "AKTA_PENDIRIAN",
        "AKTA_PENDIRIAN": "AKTA_PENDIRIAN",
        "UBODECLARATION": "UBO_DECLARATION",
        "UBO_DECLARATION": "UBO_DECLARATION",
        "NIB": "NIB",
        "ACRA": "ACRA",
    }

    for value in possible_values:
        if value and isinstance(value, str):
            cleaned = value.strip().upper()
            cleaned = aliases.get(cleaned, cleaned)
            return cleaned

    return "UNKNOWN"


def get_upload_validation_status(doc: Any) -> str:
    extracted = get_extracted_payload(doc)

    if isinstance(extracted, dict):
        upload_validation = extracted.get("upload_validation") or {}
        status = upload_validation.get("status")
        if isinstance(status, str) and status.strip():
            return status.strip().upper()

    return "UNKNOWN"