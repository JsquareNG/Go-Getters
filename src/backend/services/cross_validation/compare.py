from __future__ import annotations

import re
from datetime import datetime
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Tuple

from backend.services.cross_validation.constants import (
    ADDRESS_THRESHOLD,
    BUSINESS_NAME_THRESHOLD,
    DOCUMENT_VALIDATION_RULES,
    GENERAL_TEXT_THRESHOLD,
    PASS,
    PASS_THRESHOLD,
    PERSON_NAME_THRESHOLD,
    SEND_BACK_TO_USER,
)
from backend.services.cross_validation.normalizers import (
    normalize_address,
    normalize_business_name,
    normalize_entity_type,
    normalize_identifier,
    normalize_person_name,
    normalize_text,
    normalize_date
)
from backend.services.cross_validation.utils import is_empty




def similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def compare_values(
    form_value: Any,
    doc_value: Any,
    compare_type: str,
) -> Tuple[bool, Optional[float]]:

    if compare_type == "identifier":
        left = normalize_identifier(form_value)
        right = normalize_identifier(doc_value)
        return bool(left and right and left == right), None

    if compare_type == "date":
        left = normalize_date(form_value)
        right = normalize_date(doc_value)
        return bool(left and right and left == right), None

    if compare_type == "entity_type":
        left = normalize_entity_type(form_value)
        right = normalize_entity_type(doc_value)
        return bool(left and right and left == right), None

    if compare_type == "business_name":
        score = similarity(normalize_business_name(form_value), normalize_business_name(doc_value))
        return score >= BUSINESS_NAME_THRESHOLD, round(score, 4)

    if compare_type == "person_name":
        score = similarity(normalize_person_name(form_value), normalize_person_name(doc_value))
        return score >= PERSON_NAME_THRESHOLD, round(score, 4)

    if compare_type == "address":
        score = similarity(normalize_address(form_value), normalize_address(doc_value))
        return score >= ADDRESS_THRESHOLD, round(score, 4)

    score = similarity(normalize_text(form_value), normalize_text(doc_value))
    return score >= GENERAL_TEXT_THRESHOLD, round(score, 4)


def find_best_matching_person(
    form_person: Dict[str, Any],
    doc_individuals: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    form_id = normalize_identifier(form_person.get("id_number"))
    form_name = normalize_person_name(form_person.get("full_name"))

    if form_id:
        for doc_person in doc_individuals:
            if normalize_identifier(doc_person.get("id_number")) == form_id:
                return doc_person

    best_person = None
    best_score = 0.0

    for doc_person in doc_individuals:
        score = similarity(
            form_name,
            normalize_person_name(doc_person.get("full_name")),
        )
        if score > best_score:
            best_score = score
            best_person = doc_person

    if best_score >= PERSON_NAME_THRESHOLD:
        return best_person

    return None


def compare_individuals(
    form_individuals: List[Dict[str, Any]],
    doc_individuals: List[Dict[str, Any]],
) -> Dict[str, Any]:
    matches = []
    mismatches = []
    checked_weight = 0
    matched_weight = 0

    for form_person in form_individuals:
        form_name = form_person.get("full_name")
        form_id = form_person.get("id_number")

        if is_empty(form_name) and is_empty(form_id):
            continue

        best_doc_person = find_best_matching_person(form_person, doc_individuals)

        if not best_doc_person:
            mismatches.append({
                "form_person": form_person,
                "doc_person": None,
                "reason": "No matching person found in document.",
            })
            continue

        if not is_empty(form_name) and not is_empty(best_doc_person.get("full_name")):
            checked_weight += 2
            name_match, name_score = compare_values(
                form_name,
                best_doc_person.get("full_name"),
                "person_name",
            )
            if name_match:
                matched_weight += 2
                matches.append({
                    "field": "full_name",
                    "form_value": form_name,
                    "doc_value": best_doc_person.get("full_name"),
                    "matched": True,
                    "similarity_score": name_score,
                })
            else:
                mismatches.append({
                    "field": "full_name",
                    "form_value": form_name,
                    "doc_value": best_doc_person.get("full_name"),
                    "matched": False,
                    "similarity_score": name_score,
                })

        if not is_empty(form_id) and not is_empty(best_doc_person.get("id_number")):
            checked_weight += 3
            id_match, _ = compare_values(
                form_id,
                best_doc_person.get("id_number"),
                "identifier",
            )
            if id_match:
                matched_weight += 3
                matches.append({
                    "field": "id_number",
                    "form_value": form_id,
                    "doc_value": best_doc_person.get("id_number"),
                    "matched": True,
                    "similarity_score": None,
                })
            else:
                mismatches.append({
                    "field": "id_number",
                    "form_value": form_id,
                    "doc_value": best_doc_person.get("id_number"),
                    "matched": False,
                    "similarity_score": None,
                })

    score = round(matched_weight / checked_weight, 4) if checked_weight else 0.0

    return {
        "checked_weight": checked_weight,
        "matched_weight": matched_weight,
        "score": score,
        "matches": matches,
        "mismatches": mismatches,
    }


def build_document_reason(
    doc_type: str,
    score: float,
    checked_weight: int,
    critical_failure: bool,
) -> str:
    if checked_weight == 0:
        return f"No comparable fields found for {doc_type}."

    if critical_failure:
        return f"{doc_type} failed due to a critical field mismatch."

    if score < PASS_THRESHOLD:
        return f"{doc_type} score {score:.2f} is below threshold {PASS_THRESHOLD:.2f}."

    return f"{doc_type} passed cross-validation."


def validate_document_against_form(
    doc_type: str,
    canonical_form: Dict[str, Any],
    canonical_doc: Dict[str, Any],
) -> Dict[str, Any]:
    rules = DOCUMENT_VALIDATION_RULES.get(doc_type, [])
    matches: List[Dict[str, Any]] = []
    mismatches: List[Dict[str, Any]] = []
    checked_weight = 0
    matched_weight = 0
    critical_failure = False

    for rule in rules:
        form_field = rule["form_field"]
        doc_field = rule["doc_field"]
        compare_type = rule["compare_type"]
        weight = int(rule["weight"])
        critical = bool(rule.get("critical", False))

        form_value = canonical_form.get(form_field)
        doc_value = canonical_doc.get(doc_field)

        if is_empty(form_value) or is_empty(doc_value):
            continue

        checked_weight += weight
        is_match, similarity_score = compare_values(
            form_value=form_value,
            doc_value=doc_value,
            compare_type=compare_type,
        )

        item = {
            "form_field": form_field,
            "doc_field": doc_field,
            "form_value": form_value,
            "doc_value": doc_value,
            "compare_type": compare_type,
            "weight": weight,
            "critical": critical,
            "matched": is_match,
            "similarity_score": similarity_score,
        }

        if is_match:
            matched_weight += weight
            matches.append(item)
        else:
            mismatches.append(item)
            if critical:
                critical_failure = True

    individual_result = compare_individuals(
        canonical_form.get("individuals", []),
        canonical_doc.get("individuals", []),
    )

    checked_weight += individual_result["checked_weight"]
    matched_weight += individual_result["matched_weight"]

    score = round(matched_weight / checked_weight, 4) if checked_weight else 0.0
    status = PASS if (not critical_failure and score >= PASS_THRESHOLD) else SEND_BACK_TO_USER

    return {
        "document_type": doc_type,
        "status": status,
        "score": score,
        "checked_weight": checked_weight,
        "matched_weight": matched_weight,
        "critical_failure": critical_failure,
        "matches": matches,
        "mismatches": mismatches,
        "individual_cross_validation": individual_result,
        "reason": build_document_reason(
            doc_type=doc_type,
            score=score,
            checked_weight=checked_weight,
            critical_failure=critical_failure,
        ),
    }


def build_overall_reason(
    overall_status: str,
    overall_score: float,
    critical_failure_found: bool,
    has_warning_document: bool,
    warning_documents: list,
    mismatch_documents: list,
) -> str:
    if critical_failure_found:
        doc_types = [
            doc.get("document_type", "UNKNOWN").replace("_", " ").title()
            for doc in mismatch_documents
            if doc.get("critical_failure") is True
        ]
        doc_types = list(dict.fromkeys(doc_types))

        if doc_types:
            return (
                "There are critical mismatches between your form and the following document(s): "
                f"{', '.join(doc_types)}. Please reupload the corrected document(s)."
            )

        return "At least one critical mismatch was found between form data and document data."

    if has_warning_document:
        doc_types = [
            doc.get("document_type", "UNKNOWN").replace("_", " ").title()
            for doc in warning_documents
        ]
        doc_types = list(dict.fromkeys(doc_types))

        return (
            "Cross-validation passed, but the following documents have moderate quality issues: "
            f"{', '.join(doc_types)}. Please review and cross-check with form data."
        )

    if overall_status == SEND_BACK_TO_USER:
        return (
            f"Overall cross-validation score {overall_score:.2f} "
            f"is below threshold {PASS_THRESHOLD:.2f}."
        )

    return "Application passed cross-validation."