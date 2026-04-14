from typing import Dict, Any, List


def _norm(v: Any) -> str:
    if v is None:
        return ""
    return str(v).strip().lower()


def _add_check(
    checks: List[Dict[str, Any]],
    reasons: List[str],
    check_name: str,
    passed: bool,
    score_impact: float,
    severity: str,
    reason_if_fail: str | None = None,
    details: Dict[str, Any] | None = None,
):
    checks.append({
        "check_name": check_name,
        "passed": passed,
        "score_impact": 0.0 if passed else score_impact,
        "severity": severity,
        "details": details or {},
    })
    if not passed and reason_if_fail:
        reasons.append(reason_if_fail)


def validate_data_consistency(
    document_type: str | None,
    extracted_data: Dict[str, Any] | None,
    application_data: Dict[str, Any] | None = None,
    related_documents_data: List[Dict[str, Any]] | None = None,
) -> Dict[str, Any]:
    """
    Returns risk-style score:
    0 = no concern
    100 = highest concern
    """
    extracted_data = extracted_data or {}
    application_data = application_data or {}
    related_documents_data = related_documents_data or []

    checks: List[Dict[str, Any]] = []
    reasons: List[str] = []
    score = 0.0

    # Try multiple possible keys because your extraction schemas may vary
    extracted_business_name = (
        extracted_data.get("business_name")
        or extracted_data.get("company_name")
        or extracted_data.get("entity_name")
        or ""
    )
    form_business_name = (
        application_data.get("businessName")
        or application_data.get("business_name")
        or ""
    )

    extracted_reg_no = (
        extracted_data.get("uen")
        or extracted_data.get("nib_number")
        or extracted_data.get("registration_number")
        or extracted_data.get("npwp_number")
        or ""
    )
    form_reg_no = (
        application_data.get("registrationNumber")
        or application_data.get("registration_number")
        or application_data.get("uen")
        or application_data.get("nib_number")
        or application_data.get("npwp")
        or ""
    )

    extracted_address = (
        extracted_data.get("address")
        or extracted_data.get("registered_address")
        or extracted_data.get("business_address")
        or ""
    )
    form_address = (
        application_data.get("businessAddress")
        or application_data.get("registered_address")
        or application_data.get("address")
        or ""
    )

    # business name
    if extracted_business_name and form_business_name:
        passed = _norm(extracted_business_name) == _norm(form_business_name)
        _add_check(
            checks, reasons,
            "business_name_matches_form",
            passed=passed,
            score_impact=20,
            severity="high",
            reason_if_fail="business_name_mismatch",
            details={
                "extracted_business_name": extracted_business_name,
                "form_business_name": form_business_name,
            },
        )

    # registration no / UEN / NIB / NPWP
    if extracted_reg_no and form_reg_no:
        passed = _norm(extracted_reg_no) == _norm(form_reg_no)
        _add_check(
            checks, reasons,
            "registration_number_matches_form",
            passed=passed,
            score_impact=25,
            severity="high",
            reason_if_fail="registration_number_mismatch",
            details={
                "extracted_registration_number": extracted_reg_no,
                "form_registration_number": form_reg_no,
            },
        )

    # address
    if extracted_address and form_address:
        passed = _norm(extracted_address) == _norm(form_address)
        _add_check(
            checks, reasons,
            "address_matches_form",
            passed=passed,
            score_impact=15,
            severity="medium",
            reason_if_fail="address_mismatch",
            details={
                "extracted_address": extracted_address,
                "form_address": form_address,
            },
        )

    # compare against related docs if available
    related_names = []
    for d in related_documents_data:
        val = (
            d.get("business_name")
            or d.get("company_name")
            or d.get("entity_name")
            or ""
        )
        if val:
            related_names.append(val)

    if extracted_business_name and related_names:
        passed = any(_norm(extracted_business_name) == _norm(name) for name in related_names)
        _add_check(
            checks, reasons,
            "business_name_matches_related_documents",
            passed=passed,
            score_impact=15,
            severity="medium",
            reason_if_fail="cross_document_business_name_mismatch",
            details={
                "extracted_business_name": extracted_business_name,
                "related_names": related_names,
            },
        )

    for c in checks:
        if not c["passed"]:
            score += float(c["score_impact"])

    score = max(0, min(100, int(round(score))))

    if score >= 50:
        status = "MAJOR_MISMATCH"
    elif score >= 20:
        status = "MINOR_MISMATCH"
    elif score > 0:
        status = "REVIEW"
    else:
        status = "CONSISTENT"

    return {
        "score": score,
        "status": status,
        "checks": checks,
        "reasons_flagged": reasons,
    }