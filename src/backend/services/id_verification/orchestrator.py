import re
from .constants import DocType, Route
from .ocr.document_ai import ocr_to_text, detect_mime
from .doc_type.detector import detect_doc_type
from .extractors.nric_extractor import extract_nric_data
from .extractors.ktp_extractor import extract_ktp_from_text
from .validators.fields import validate_extracted

def _clean_for_detection(text: str) -> str:
    t = text or ""
    t = t.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"[ \t]+", " ", t)
    return t.strip()

def route_without_form(doc_type: DocType, validation_issues: list[dict]) -> Route:
    if doc_type == DocType.UNKNOWN:
        return Route.MANUAL_REVIEW
    if any(i["severity"] == "HIGH" for i in validation_issues):
        return Route.MANUAL_REVIEW
    return Route.NEEDS_ACTION

def extract_and_validate(file_bytes: bytes, content_type: str | None, filename: str | None):
    # 1) OCR
    mime_type = detect_mime(content_type, filename)
    raw_text, ocr_meta = ocr_to_text(file_bytes, mime_type)

    # 2) Detect doc type
    doc_type = detect_doc_type(_clean_for_detection(raw_text))

    # 3) Extract fields
    if doc_type == DocType.SG_NRIC:
        extracted = extract_nric_data(raw_text)
    elif doc_type == DocType.ID_KTP:
        extracted = extract_ktp_from_text(raw_text)
    else:
        extracted = {}

    extracted["_ocr_meta"] = ocr_meta

    # 4) Validate extracted fields
    validation_issues = validate_extracted(doc_type, extracted)

    # stop at validate fields (no compare yet)
    route = route_without_form(doc_type, validation_issues)

    return {
        "success": True,
        "doc_type": doc_type,
        "extracted": extracted,
        "validation_issues": validation_issues,
        "route": route,
    }