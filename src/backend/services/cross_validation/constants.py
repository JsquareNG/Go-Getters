from __future__ import annotations

from typing import Any, Dict, List

PASS = "PASS"
SEND_BACK_TO_USER = "SEND_BACK_TO_USER"

SEND_TO_RULES_ENGINE = "SEND_TO_RULES_ENGINE"
SEND_TO_RULES_ENGINE_AND_MANUAL_REVIEW_AFTER = "SEND_TO_RULES_ENGINE_AND_MANUAL_REVIEW_AFTER"

PASS_THRESHOLD = 0.75

BUSINESS_NAME_THRESHOLD = 0.90
PERSON_NAME_THRESHOLD = 0.85
ADDRESS_THRESHOLD = 0.80
GENERAL_TEXT_THRESHOLD = 0.85

SUPPORTED_CROSS_VALIDATION_DOC_TYPES = {
    "ACRA",
    "NIB",
    "NPWP_CERTIFICATE",
    "BANK_STATEMENT",
    "BOARD_RESOLUTION",
    "LLP_RESOLUTION",
    "OFFICE_LEASE",
    "TENANCY_AGREEMENT",
    "AKTA_PENDIRIAN",
    "UBO_DECLARATION",
}

DOCUMENT_VALIDATION_RULES: Dict[str, List[Dict[str, Any]]] = {
    "ACRA": [
        {
            "form_field": "business_name",
            "doc_field": "business_name",
            "compare_type": "business_name",
            "weight": 3,
            "critical": True,
        },
        {
            "form_field": "registration_number",
            "doc_field": "registration_number",
            "compare_type": "identifier",
            "weight": 3,
            "critical": True,
        },
        {
            "form_field": "registered_address",
            "doc_field": "registered_address",
            "compare_type": "address",
            "weight": 2,
            "critical": False,
        },
        {
            "form_field": "registration_date",
            "doc_field": "registration_date",
            "compare_type": "date",
            "weight": 2,
            "critical": False,
        },
        {
            "form_field": "entity_type",
            "doc_field": "entity_type",
            "compare_type": "entity_type",
            "weight": 1,
            "critical": False,
        },
    ],
    "NIB": [
        {
            "form_field": "business_name",
            "doc_field": "business_name",
            "compare_type": "business_name",
            "weight": 3,
            "critical": True,
        },
        {
            "form_field": "registration_number",
            "doc_field": "registration_number",
            "compare_type": "identifier",
            "weight": 3,
            "critical": True,
        },
        {
            "form_field": "registered_address",
            "doc_field": "registered_address",
            "compare_type": "address",
            "weight": 2,
            "critical": False,
        },
        {
            "form_field": "registration_date",
            "doc_field": "registration_date",
            "compare_type": "date",
            "weight": 2,
            "critical": False,
        },
    ],
    "NPWP_CERTIFICATE": [
        {
            "form_field": "business_name",
            "doc_field": "business_name",
            "compare_type": "business_name",
            "weight": 3,
            "critical": True,
        },
        {
            "form_field": "tax_number",
            "doc_field": "tax_number",
            "compare_type": "identifier",
            "weight": 3,
            "critical": True,
        },
        {
            "form_field": "registered_address",
            "doc_field": "registered_address",
            "compare_type": "address",
            "weight": 2,
            "critical": False,
        },
        {
            "form_field": "registration_date",
            "doc_field": "registration_date",
            "compare_type": "date",
            "weight": 1,
            "critical": False,
        },
    ],
    "BANK_STATEMENT": [
        {
            "form_field": "business_name",
            "doc_field": "account_holder_name",
            "compare_type": "business_name",
            "weight": 3,
            "critical": True,
        },
        {
            "form_field": "bank_account_number",
            "doc_field": "bank_account_number",
            "compare_type": "identifier",
            "weight": 3,
            "critical": True,
        },
        {
            "form_field": "registered_address",
            "doc_field": "registered_address",
            "compare_type": "address",
            "weight": 1,
            "critical": False,
        },
    ],
    "BOARD_RESOLUTION": [
        {
            "form_field": "business_name",
            "doc_field": "business_name",
            "compare_type": "business_name",
            "weight": 3,
            "critical": True,
        },
        {
            "form_field": "registration_date",
            "doc_field": "resolution_date",
            "compare_type": "date",
            "weight": 1,
            "critical": False,
            "optional": True,
        },
    ],
    "LLP_RESOLUTION": [
        {
            "form_field": "business_name",
            "doc_field": "business_name",
            "compare_type": "business_name",
            "weight": 3,
            "critical": True,
        },
        {
            "form_field": "registered_address",
            "doc_field": "registered_address",
            "compare_type": "address",
            "weight": 2,
            "critical": False,
        },
    ],
    "OFFICE_LEASE": [
        {
            "form_field": "business_name",
            "doc_field": "tenant_name",
            "compare_type": "business_name",
            "weight": 3,
            "critical": False,
        },
        {
            "form_field": "registered_address",
            "doc_field": "registered_address",
            "compare_type": "address",
            "weight": 3,
            "critical": True,
        },
    ],
    "TENANCY_AGREEMENT": [
        {
            "form_field": "business_name",
            "doc_field": "tenant_name",
            "compare_type": "business_name",
            "weight": 2,
            "critical": False,
        },
        {
            "form_field": "registered_address",
            "doc_field": "leased_premises_address",
            "compare_type": "address",
            "weight": 3,
            "critical": True,
        },
    ],
    "AKTA_PENDIRIAN": [
        {
            "form_field": "business_name",
            "doc_field": "business_name",
            "compare_type": "business_name",
            "weight": 3,
            "critical": True,
        },
        {
            "form_field": "registration_number",
            "doc_field": "registration_number",
            "compare_type": "identifier",
            "weight": 2,
            "critical": False,
        },
        {
            "form_field": "registered_address",
            "doc_field": "registered_address",
            "compare_type": "address",
            "weight": 2,
            "critical": False,
        },
        {
            "form_field": "registration_date",
            "doc_field": "registration_date",
            "compare_type": "date",
            "weight": 2,
            "critical": False,
        },
    ],
    "UBO_DECLARATION": [
        {
            "form_field": "business_name",
            "doc_field": "business_name",
            "compare_type": "business_name",
            "weight": 3,
            "critical": True,
        },
        {
            "form_field": "registration_number",
            "doc_field": "registration_number",
            "compare_type": "identifier",
            "weight": 2,
            "critical": False,
        },
    ],
}