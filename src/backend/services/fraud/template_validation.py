from typing import Dict, Any, List


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


def _contains_any(text: str, keywords: List[str]) -> bool:
    text = (text or "").lower()
    return any(k.lower() in text for k in keywords)


def validate_document_template(
    document_type: str | None,
    raw_text: str | None,
    extracted_data: Dict[str, Any] | None = None,
    pdf_analysis: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """
    Returns risk-style score:
    0 = no concern
    100 = highest concern
    """
    extracted_data = extracted_data or {}
    raw_text = raw_text or ""

    checks: List[Dict[str, Any]] = []
    reasons: List[str] = []
    score = 0.0

    expected_document_type = document_type
    detected_document_type = document_type or "UNKNOWN"

    lowered = raw_text.lower()

    # generic checks
    _add_check(
        checks, reasons,
        "text_not_empty",
        passed=bool(raw_text.strip()),
        score_impact=25,
        severity="high",
        reason_if_fail="document_text_missing",
    )

    # document-specific checks
    if document_type == "ACRA_BUSINESS_PROFILE":
        has_acra = _contains_any(lowered, ["accounting and corporate regulatory authority", "acra"])
        has_uen = _contains_any(lowered, ["uen", "unique entity number"])
        has_business_name = _contains_any(lowered, ["business name", "entity name", "company name"])
        has_registration = _contains_any(lowered, ["registration", "date of registration", "incorporation"])

        _add_check(checks, reasons, "acra_marker_present", has_acra, 20, "high", "missing_acra_marker")
        _add_check(checks, reasons, "uen_marker_present", has_uen, 15, "high", "missing_uen_marker")
        _add_check(checks, reasons, "business_name_marker_present", has_business_name, 12, "medium", "missing_business_name_marker")
        _add_check(checks, reasons, "registration_marker_present", has_registration, 10, "medium", "missing_registration_marker")

    elif document_type == "NIB":
        has_nib = _contains_any(lowered, ["nomor induk berusaha", "nib"])
        has_business_name = _contains_any(lowered, ["nama usaha", "business name", "nama perusahaan"])
        has_address = _contains_any(lowered, ["alamat", "address"])

        _add_check(checks, reasons, "nib_marker_present", has_nib, 20, "high", "missing_nib_marker")
        _add_check(checks, reasons, "business_name_marker_present", has_business_name, 12, "medium", "missing_business_name_marker")
        _add_check(checks, reasons, "address_marker_present", has_address, 10, "medium", "missing_address_marker")

    elif document_type == "NPWP_CERTIFICATE":
        has_npwp = _contains_any(lowered, ["npwp", "nomor pokok wajib pajak"])
        has_taxpayer = _contains_any(lowered, ["wajib pajak", "taxpayer"])
        _add_check(checks, reasons, "npwp_marker_present", has_npwp, 20, "high", "missing_npwp_marker")
        _add_check(checks, reasons, "taxpayer_marker_present", has_taxpayer, 12, "medium", "missing_taxpayer_marker")

    elif document_type == "BANK_STATEMENT":
        has_statement = _contains_any(lowered, ["statement", "bank statement", "account summary"])
        has_account = _contains_any(lowered, ["account number", "account no", "rekening"])
        has_balance = _contains_any(lowered, ["balance", "saldo"])

        _add_check(checks, reasons, "statement_marker_present", has_statement, 15, "high", "missing_statement_marker")
        _add_check(checks, reasons, "account_marker_present", has_account, 12, "medium", "missing_account_marker")
        _add_check(checks, reasons, "balance_marker_present", has_balance, 10, "medium", "missing_balance_marker")

    else:
        # unknown or generic doc
        _add_check(
            checks, reasons,
            "document_type_known",
            passed=bool(document_type and document_type != "UNKNOWN"),
            score_impact=15,
            severity="medium",
            reason_if_fail="unknown_document_type",
        )

    # PDF checks
    if pdf_analysis:
        page_count = int(pdf_analysis.get("page_count", 0) or 0)
        _add_check(
            checks, reasons,
            "pdf_has_pages",
            passed=page_count > 0,
            score_impact=20,
            severity="high",
            reason_if_fail="pdf_has_no_pages",
            details={"page_count": page_count},
        )

        if pdf_analysis.get("detected_editing_software"):
            _add_check(
                checks, reasons,
                "pdf_metadata_editing_software_absent",
                passed=False,
                score_impact=15,
                severity="medium",
                reason_if_fail="pdf_metadata_editing_software_detected",
                details={"detected_editing_software": pdf_analysis.get("detected_editing_software")},
            )
        else:
            _add_check(
                checks, reasons,
                "pdf_metadata_editing_software_absent",
                passed=True,
                score_impact=0,
                severity="low",
            )

    for c in checks:
        if not c["passed"]:
            score += float(c["score_impact"])

    score = max(0, min(100, int(round(score))))

    if score >= 60:
        status = "INVALID"
    elif score >= 30:
        status = "PARTIAL"
    elif score > 0:
        status = "REVIEW"
    else:
        status = "VALID"

    return {
        "score": score,
        "status": status,
        "expected_document_type": expected_document_type,
        "detected_document_type": detected_document_type,
        "checks": checks,
        "reasons_flagged": reasons,
    }