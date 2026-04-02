from typing import Optional, Dict, Any, List
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from backend.services.gemini_extractor import parse_universal_document, classify_document
from backend.services.document_ai import extract_document_layout
from backend.models.extract import DOCUMENT_SCHEMA_REGISTRY
from backend.services.gemini_basic_extractor import (
    classify_business_document,
    parse_basic_info_document,
)

router = APIRouter(prefix="/extract", tags=["OCR Extraction"])


SUPPORTED_CONTENT_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
]


# ----------------------------
# Doc type normalization
# ----------------------------
# Keep aliases minimal and compatible with your current files.
# classify_business_document -> ACRA / NIB / UNKNOWN
# classify_document -> supported registry labels, but prompt also mentions ACRA
DOC_TYPE_ALIASES = {
    "ACRA_BUSINESS_PROFILE": "ACRA",
    "ACRA": "ACRA",
    "NIB": "NIB",
    "UNKNOWN": "UNKNOWN",
}


STANDARDISED_TEMPLATE_DOC_TYPES = {"ACRA", "NIB"}
BUSINESS_BASIC_INFO_DOC_TYPES = {"ACRA", "NIB"}


def normalize_doc_type(doc_type: Optional[str]) -> str:
    if not doc_type:
        return "UNKNOWN"
    cleaned = doc_type.strip().upper()
    return DOC_TYPE_ALIASES.get(cleaned, cleaned)


def _validate_file_type(content_type: Optional[str]):
    if content_type not in SUPPORTED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, JPG, PNG allowed"
        )


async def _run_initial_document_processing(file: UploadFile):
    _validate_file_type(file.content_type)

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    doc_ai_result = extract_document_layout(file_bytes, file.content_type)
    raw_text = (doc_ai_result.get("raw_text") or "").strip()

    if not raw_text:
        raise HTTPException(
            status_code=400,
            detail="Document AI extracted no text."
        )

    return file_bytes, doc_ai_result, raw_text


def _contains_any(text: str, keywords: List[str]) -> bool:
    upper_text = text.upper()
    return any(keyword.upper() in upper_text for keyword in keywords)


def _basic_identifier_presence_check(detected_doc_type: str, raw_text: str) -> List[str]:
    warnings: List[str] = []
    upper_text = raw_text.upper()

    if detected_doc_type == "ACRA":
        if "UEN" not in upper_text:
            warnings.append("Expected identifier 'UEN' was not found in the document text.")

    elif detected_doc_type == "NIB":
        if "NIB" not in upper_text and "NOMOR INDUK BERUSAHA" not in upper_text:
            warnings.append("Expected identifier 'NIB' was not found in the document text.")

    return warnings


def _basic_template_anchor_check(detected_doc_type: str, raw_text: str) -> List[str]:
    warnings: List[str] = []
    upper_text = raw_text.upper()

    if detected_doc_type == "ACRA":
        anchor_keywords = [
            "ACCOUNTING AND CORPORATE REGULATORY AUTHORITY",
            "ACRA",
            "BUSINESS PROFILE",
            "ENTITY NAME",
            "UEN",
        ]
        matches = sum(1 for kw in anchor_keywords if kw in upper_text)
        if matches < 2:
            warnings.append("Document weakly matches expected ACRA business profile structure.")

    elif detected_doc_type == "NIB":
        anchor_keywords = [
            "NIB",
            "NOMOR INDUK BERUSAHA",
            "BADAN KOORDINASI PENANAMAN MODAL",
            "NPWP",
            "INDONESIA",
        ]
        matches = sum(1 for kw in anchor_keywords if kw in upper_text)
        if matches < 2:
            warnings.append("Document weakly matches expected Indonesian NIB structure.")

    return warnings


def _light_upload_validation(
    raw_text: str,
    detected_doc_type: str,
    expected_doc_type: Optional[str] = None,
) -> Dict[str, Any]:
    detected_doc_type = normalize_doc_type(detected_doc_type)
    expected_doc_type = normalize_doc_type(expected_doc_type) if expected_doc_type else None

    hard_fail_reasons: List[str] = []
    warnings: List[str] = []

    # 1. OCR sanity
    if len(raw_text.strip()) < 30:
        hard_fail_reasons.append(
            "Extracted text is too short. Document may be blank, unclear, or unreadable."
        )

    # 2. Expected upload slot match
    expected_document_match = True
    if expected_doc_type and expected_doc_type != "UNKNOWN":
        if detected_doc_type != expected_doc_type:
            expected_document_match = False
            hard_fail_reasons.append(
                f"Detected document type '{detected_doc_type}' does not match expected upload type '{expected_doc_type}'."
            )

    # 3. Soft checks only for standardised docs
    warnings.extend(_basic_identifier_presence_check(detected_doc_type, raw_text))

    if detected_doc_type in STANDARDISED_TEMPLATE_DOC_TYPES:
        warnings.extend(_basic_template_anchor_check(detected_doc_type, raw_text))

    if hard_fail_reasons:
        status = "FAIL"
    elif warnings:
        status = "WARNING"
    else:
        status = "PASS"

    return {
        "status": status,
        "expected_document_match": expected_document_match,
        "reasons": hard_fail_reasons + warnings,
    }


def _resolve_universal_parse_doc_type(detected_doc_type: str) -> str:
    """
    Keep compatibility with your parse_universal_document().
    If the classifier returns something not in DOCUMENT_SCHEMA_REGISTRY,
    fall back to UNKNOWN.
    """
    normalized = normalize_doc_type(detected_doc_type)

    if normalized in DOCUMENT_SCHEMA_REGISTRY:
        return normalized

    # in case your registry actually stores ACRA_BUSINESS_PROFILE instead of ACRA
    if normalized == "ACRA" and "ACRA_BUSINESS_PROFILE" in DOCUMENT_SCHEMA_REGISTRY:
        return "ACRA_BUSINESS_PROFILE"

    return "UNKNOWN"


@router.post("/classify-and-extract")
async def classify_and_extract_document(file: UploadFile = File(...)):
    try:
        # 1. Shared initial processing
        _, doc_ai_result, raw_text = await _run_initial_document_processing(file)

        # 2. Classify
        detected_doc_type_raw = classify_document(raw_text)
        detected_doc_type = normalize_doc_type(detected_doc_type_raw)

        # 3. Light validation
        upload_validation = _light_upload_validation(
            raw_text=raw_text,
            detected_doc_type=detected_doc_type
        )

        # 4. Universal extraction
        parse_doc_type = _resolve_universal_parse_doc_type(detected_doc_type_raw)
        final_data = parse_universal_document(raw_text, parse_doc_type)

        # 5. Determine support from actual parse type
        is_supported = parse_doc_type != "UNKNOWN"

        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "document_type": parse_doc_type,
            "classified_as": detected_doc_type,
            "is_supported": is_supported,
            "upload_validation": upload_validation,
            "data": final_data,
        }

    except ValueError as ve:
        raise HTTPException(
            status_code=422,
            detail=f"Validation Error: {str(ve)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Processing Error: {str(e)}"
        )


@router.post("/universal-basic-info")
async def extract_universal_basic_info(file: UploadFile = File(...)):
    try:
        # 1. Shared initial processing
        _, doc_ai_result, raw_text = await _run_initial_document_processing(file)

        # 2. Business doc classification
        detected_doc_type_raw = classify_business_document(raw_text)
        detected_doc_type = normalize_doc_type(detected_doc_type_raw)

        # 3. Light validation
        upload_validation = _light_upload_validation(
            raw_text=raw_text,
            detected_doc_type=detected_doc_type,

        )

        # 4. Only ACRA / NIB supported here
        if detected_doc_type not in BUSINESS_BASIC_INFO_DOC_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Only ACRA business profiles and Indonesian NIB documents are supported for basic autofill."
            )

        # 5. Basic extraction using your existing Gemini basic extractor
        final_data = parse_basic_info_document(raw_text, detected_doc_type)

        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "document_type": detected_doc_type,
            "upload_validation": upload_validation,
            "data": final_data,
        }

    except ValueError as ve:
        raise HTTPException(status_code=422, detail=f"Validation Error: {str(ve)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing Error: {str(e)}")