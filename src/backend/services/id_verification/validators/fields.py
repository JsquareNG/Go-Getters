import re
from typing import Any, Dict, List
from ..constants import DocType

def validate_extracted(doc_type: DocType, extracted: Dict[str, Any]) -> List[dict]:
    issues: List[dict] = []

    def add(code: str, severity: str, message: str, field: str | None = None):
        issues.append({"code": code, "severity": severity, "message": message, "field": field})

    if doc_type == DocType.SG_NRIC:
        nric = (extracted.get("nric") or "").upper()
        if not nric:
            add("NRIC_MISSING", "HIGH", "NRIC number not found", "nric")
        elif not re.fullmatch(r"[STFG]\d{7}[A-Z]|[STFG]\d{8}", nric):
            add("NRIC_FORMAT", "HIGH", "NRIC format looks invalid", "nric")

        if not extracted.get("full_name"):
            add("NAME_MISSING", "HIGH", "Name not found", "full_name")

        if not extracted.get("date_of_birth"):
            add("DOB_MISSING", "WARN", "Date of birth not found", "date_of_birth")

    elif doc_type == DocType.ID_KTP:
        nik = extracted.get("nik") or ""
        if not nik:
            add("NIK_MISSING", "HIGH", "NIK not found", "nik")
        elif not re.fullmatch(r"\d{16}", nik):
            add("NIK_FORMAT", "HIGH", "NIK must be 16 digits", "nik")

        if not extracted.get("full_name"):
            add("NAME_MISSING", "HIGH", "Name not found", "full_name")

    else:
        add("DOC_TYPE_UNKNOWN", "HIGH", "Unable to detect document type", None)

    return issues