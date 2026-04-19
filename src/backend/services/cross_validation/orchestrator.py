from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.models.application import ApplicationForm
from backend.models.documents import Document
from backend.services.cross_validation.compare import (
    build_overall_reason,
    validate_document_against_form,
)
from backend.services.cross_validation.constants import (
    PASS,
    PASS_THRESHOLD,
    SEND_BACK_TO_USER,
    SEND_TO_RULES_ENGINE,
    SEND_TO_RULES_ENGINE_AND_MANUAL_REVIEW_AFTER,
    SUPPORTED_CROSS_VALIDATION_DOC_TYPES,
)
from backend.services.cross_validation.finalize import build_finalized_rules_engine_payload
from backend.services.cross_validation.normalizers import (
    normalize_document_data,
    normalize_form_data,
)
from backend.services.cross_validation.utils import (
    detect_document_type,
    extract_effective_form_data,
    get_attr,
    get_extracted_payload,
    get_upload_validation_status,
)


def build_routing_decision(
    cross_validation_status: str,
    has_warning_document: bool,
) -> str:
    if cross_validation_status == SEND_BACK_TO_USER:
        return SEND_BACK_TO_USER

    if has_warning_document:
        return SEND_TO_RULES_ENGINE_AND_MANUAL_REVIEW_AFTER

    return SEND_TO_RULES_ENGINE


def cross_validate_application(
    db: Session,
    application_id: str,
    mock_documents: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    application = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.application_id == application_id)
        .first()
    )

    if not application:
        return {
            "application_id": application_id,
            "status": SEND_BACK_TO_USER,
            "routing_decision": SEND_BACK_TO_USER,
            "overall_score": 0.0,
            "threshold": PASS_THRESHOLD,
            "reason": "Application not found.",
            "document_results": [],
        }

    form_data = application.form_data or {}
    effective_form_data = extract_effective_form_data(form_data)
    canonical_form = normalize_form_data(effective_form_data)

    if mock_documents is not None:
        documents = mock_documents
    else:
        documents = (
            db.query(Document)
            .filter(Document.application_id == application_id)
            .all()
        )

    if not documents:
        return {
            "application_id": application_id,
            "status": SEND_BACK_TO_USER,
            "routing_decision": SEND_BACK_TO_USER,
            "overall_score": 0.0,
            "threshold": PASS_THRESHOLD,
            "reason": "No documents found for cross-validation.",
            "document_results": [],
        }

    document_results: List[Dict[str, Any]] = []
    warning_documents: List[Dict[str, Any]] = []
    mismatch_documents: List[Dict[str, Any]] = []

    total_weight = 0
    matched_weight = 0
    critical_failure_found = False
    checked_docs = 0
    warning_docs_count = 0
    pass_docs_count = 0

    for doc in documents:
        doc_type = detect_document_type(doc)
        if doc_type not in SUPPORTED_CROSS_VALIDATION_DOC_TYPES:
            continue

        document_id = get_attr(doc, "document_id")
        extracted = get_extracted_payload(doc)
        upload_status = get_upload_validation_status(doc)

        if upload_status == "WARNING":
            warning_docs_count += 1
            warning_documents.append(
                {
                    "document_id": document_id,
                    "document_type": doc_type,
                    "upload_validation_status": upload_status,
                }
            )
        elif upload_status == "PASS":
            pass_docs_count += 1

        if not extracted:
            skipped_result = {
                "document_id": document_id,
                "document_type": doc_type,
                "upload_validation_status": upload_status,
                "status": "SKIPPED",
                "score": 0.0,
                "checked_weight": 0,
                "matched_weight": 0,
                "critical_failure": False,
                "reason": "Document has no extracted_data and was skipped.",
                "matches": [],
                "mismatches": [],
            }
            document_results.append(skipped_result)
            continue

        canonical_doc = normalize_document_data(doc_type, extracted)
        result = validate_document_against_form(doc_type, canonical_form, canonical_doc)
        result["document_id"] = document_id
        result["upload_validation_status"] = upload_status
        document_results.append(result)

        if result["checked_weight"] > 0:
            checked_docs += 1
            total_weight += result["checked_weight"]
            matched_weight += result["matched_weight"]

        if result["critical_failure"]:
            critical_failure_found = True

        if result["status"] == SEND_BACK_TO_USER:
            mismatch_documents.append(
                {
                    "document_id": result.get("document_id"),
                    "document_type": result.get("document_type"),
                    "status": result.get("status"),
                    "critical_failure": result.get("critical_failure", False),
                    "reason": result.get("reason"),
                    "mismatch_fields": [
                        {
                            "form_field": item.get("form_field"),
                            "doc_field": item.get("doc_field"),
                            "critical": item.get("critical", False),
                            "form_value": item.get("form_value"),
                            "doc_value": item.get("doc_value"),
                        }
                        for item in result.get("mismatches", [])
                    ],
                }
            )

    if checked_docs == 0:
        return {
            "application_id": application_id,
            "status": SEND_BACK_TO_USER,
            "routing_decision": SEND_BACK_TO_USER,
            "overall_score": 0.0,
            "threshold": PASS_THRESHOLD,
            "reason": "No supported documents available for cross-validation.",
            "summary": {
                "documents_found": len(documents),
                "documents_checked": checked_docs,
                "warning_documents": warning_docs_count,
                "warning_document_details": warning_documents,
                "mismatch_document_details": mismatch_documents,
                "pass_documents": pass_docs_count,
                "total_checked_weight": total_weight,
                "matched_weight": matched_weight,
            },
            "document_results": document_results,
        }

    overall_score = round(matched_weight / total_weight, 4) if total_weight else 0.0

    if critical_failure_found or overall_score < PASS_THRESHOLD:
        overall_status = SEND_BACK_TO_USER
    else:
        overall_status = PASS

    has_warning_document = warning_docs_count > 0
    routing_decision = build_routing_decision(
        cross_validation_status=overall_status,
        has_warning_document=has_warning_document,
    )

    result = {
        "application_id": application_id,
        "status": overall_status,
        "routing_decision": routing_decision,
        "overall_score": overall_score,
        "threshold": PASS_THRESHOLD,
        "reason": build_overall_reason(
            overall_status=overall_status,
            overall_score=overall_score,
            critical_failure_found=critical_failure_found,
            has_warning_document=has_warning_document,
            warning_documents=warning_documents,
            mismatch_documents=mismatch_documents,
        ),
        "summary": {
            "documents_found": len(documents),
            "documents_checked": checked_docs,
            "warning_documents": warning_docs_count,
            "warning_document_details": warning_documents,
            "mismatch_document_details": mismatch_documents,
            "pass_documents": pass_docs_count,
            "has_warning_document": has_warning_document,
            "total_checked_weight": total_weight,
            "matched_weight": matched_weight,
        },
    }

    if routing_decision != SEND_BACK_TO_USER:
        result["rules_engine_payload"] = build_finalized_rules_engine_payload(
            application_id=application_id,
            canonical_form=canonical_form,
            documents=documents,
            document_results=document_results,
            cross_validation_result=result,
        )

    return result


def should_send_back_to_user(db: Session, application_id: str) -> bool:
    result = cross_validate_application(db=db, application_id=application_id)
    return result["status"] == SEND_BACK_TO_USER