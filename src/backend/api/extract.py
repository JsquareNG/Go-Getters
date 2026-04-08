import os
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

DOC_TYPE_ALIASES = {
    "ACRA_BUSINESS_PROFILE": "ACRA",
    "ACRA": "ACRA",
    "NIB": "NIB",
    "UNKNOWN": "UNKNOWN",
}

STANDARDISED_TEMPLATE_DOC_TYPES = {"ACRA", "NIB"}
BUSINESS_BASIC_INFO_DOC_TYPES = {"ACRA", "NIB"}

OCR_MIN_PRIMARY_CONFIDENCE = float(os.getenv("OCR_MIN_PRIMARY_CONFIDENCE", "0.70"))
OCR_MIN_PAGE_CONFIDENCE = float(os.getenv("OCR_MIN_PAGE_CONFIDENCE", "0.55"))
OCR_MIN_QUALITY_SCORE = float(os.getenv("OCR_MIN_QUALITY_SCORE", "65"))
OCR_FAIL_THRESHOLD = 65
OCR_WARNING_THRESHOLD = 75

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


def _get_anchor_keywords(detected_doc_type: str) -> List[str]:
    if detected_doc_type == "ACRA":
        return [
            "ACCOUNTING AND CORPORATE REGULATORY AUTHORITY",
            "ACRA",
            "BUSINESS PROFILE",
            "ENTITY NAME",
            "UEN",
        ]
    if detected_doc_type == "NIB":
        return [
            "NIB",
            "NOMOR INDUK BERUSAHA",
            "BADAN KOORDINASI PENANAMAN MODAL",
            "NPWP",
            "INDONESIA",
        ]
    return []


def _basic_template_anchor_check(detected_doc_type: str, raw_text: str) -> List[str]:
    warnings: List[str] = []
    upper_text = raw_text.upper()

    anchor_keywords = _get_anchor_keywords(detected_doc_type)
    if anchor_keywords:
        matches = sum(1 for kw in anchor_keywords if kw in upper_text)
        if matches < 2:
            if detected_doc_type == "ACRA":
                warnings.append("Document weakly matches expected ACRA business profile structure.")
            elif detected_doc_type == "NIB":
                warnings.append("Document weakly matches expected Indonesian NIB structure.")

    return warnings


def _safe_float(v, default: Optional[float] = None) -> Optional[float]:
    try:
        if v is None:
            return default
        return float(v)
    except Exception:
        return default


def _build_ocr_quality_assessment(
    doc_ai_result: Dict[str, Any],
    raw_text: str,
    detected_doc_type: str,
) -> Dict[str, Any]:
    stats = doc_ai_result.get("ocr_confidence_stats") or {}

    primary_confidence = _safe_float(stats.get("primary_confidence"))
    mean_page_confidence = _safe_float(stats.get("mean_page_confidence"))
    min_page_confidence = _safe_float(stats.get("min_page_confidence"))
    low_conf_token_ratio = _safe_float(stats.get("low_conf_token_ratio"), 0.0)
    raw_text_length = len(raw_text.strip())

    anchor_keywords = _get_anchor_keywords(detected_doc_type)
    anchor_matches = 0
    anchor_ratio = 1.0
    if anchor_keywords:
        upper_text = raw_text.upper()
        anchor_matches = sum(1 for kw in anchor_keywords if kw in upper_text)
        anchor_ratio = anchor_matches / len(anchor_keywords)

    text_length_score = 1.0 if raw_text_length >= 200 else raw_text_length / 200.0

    effective_primary = (
        primary_confidence
        if primary_confidence is not None
        else mean_page_confidence
        if mean_page_confidence is not None
        else 0.0
    )

    effective_page_min = (
        min_page_confidence
        if min_page_confidence is not None
        else effective_primary
    )

    quality_score = (
        (effective_primary * 55.0)
        + (effective_page_min * 20.0)
        + ((1.0 - min(max(low_conf_token_ratio, 0.0), 1.0)) * 10.0)
        + (anchor_ratio * 10.0)
        + (text_length_score * 5.0)
    )
    quality_score = round(max(0.0, min(100.0, quality_score)), 2)

    reasons: List[str] = []

    if effective_primary < OCR_MIN_PRIMARY_CONFIDENCE:
        reasons.append(
            f"OCR primary confidence {effective_primary:.3f} is below threshold {OCR_MIN_PRIMARY_CONFIDENCE:.3f}."
        )

    if effective_page_min < OCR_MIN_PAGE_CONFIDENCE:
        reasons.append(
            f"Minimum page confidence {effective_page_min:.3f} is below threshold {OCR_MIN_PAGE_CONFIDENCE:.3f}."
        )

    hard_fail = False

    if effective_primary < OCR_MIN_PRIMARY_CONFIDENCE:
        hard_fail = True

    # New logic based on quality score bands
    if quality_score < OCR_FAIL_THRESHOLD:
        hard_fail = True

    if raw_text_length < 30:
        reasons.append("Extracted text is too short. Document may be unreadable.")

    if effective_primary < OCR_MIN_PRIMARY_CONFIDENCE:
        hard_fail = True

    if quality_score < OCR_MIN_QUALITY_SCORE:
        hard_fail = True

    # page minimum confidence is warning-only, not hard fail
    passes_threshold = not hard_fail

    if quality_score >= 75:
        quality_band = "HIGH"
    elif quality_score >= 65:
        quality_band = "MEDIUM"
    elif quality_score >= 45:
        quality_band = "LOW"
    else:
        quality_band = "VERY_LOW"

    return {
        "passes_threshold": passes_threshold,
        "quality_band": quality_band,
        "quality_score": quality_score,
        "primary_confidence": round(effective_primary, 4),
        "min_page_confidence": round(effective_page_min, 4),
        "mean_page_confidence": round(mean_page_confidence, 4) if mean_page_confidence is not None else None,
        "low_conf_token_ratio": round(low_conf_token_ratio, 4) if low_conf_token_ratio is not None else None,
        "raw_text_length": raw_text_length,
        "anchor_matches": anchor_matches,
        "anchor_total": len(anchor_keywords),
        "anchor_ratio": round(anchor_ratio, 4),
        "thresholds": {
            "min_primary_confidence": OCR_MIN_PRIMARY_CONFIDENCE,
            "min_page_confidence": OCR_MIN_PAGE_CONFIDENCE,
            "min_quality_score": OCR_MIN_QUALITY_SCORE,
        },
        "reasons": reasons,
        "stats": stats,
    }


def _build_ocr_quality_only_assessment(
    doc_ai_result: Dict[str, Any],
    raw_text: str,
) -> Dict[str, Any]:
    stats = doc_ai_result.get("ocr_confidence_stats") or {}

    primary_confidence = _safe_float(stats.get("primary_confidence"))
    mean_page_confidence = _safe_float(stats.get("mean_page_confidence"))
    min_page_confidence = _safe_float(stats.get("min_page_confidence"))
    low_conf_token_ratio = _safe_float(stats.get("low_conf_token_ratio"), 0.0)
    raw_text_length = len(raw_text.strip())

    text_length_score = 1.0 if raw_text_length >= 200 else raw_text_length / 200.0

    effective_primary = (
        primary_confidence
        if primary_confidence is not None
        else mean_page_confidence
        if mean_page_confidence is not None
        else 0.0
    )

    effective_page_min = (
        min_page_confidence
        if min_page_confidence is not None
        else effective_primary
    )

    quality_score = (
        (effective_primary * 60.0)
        + (effective_page_min * 25.0)
        + ((1.0 - min(max(low_conf_token_ratio, 0.0), 1.0)) * 10.0)
        + (text_length_score * 5.0)
    )
    quality_score = round(max(0.0, min(100.0, quality_score)), 2)

    reasons: List[str] = []
    hard_fail = False

    if effective_primary < OCR_MIN_PRIMARY_CONFIDENCE:
        reasons.append(
            f"OCR primary confidence {effective_primary:.3f} is below threshold {OCR_MIN_PRIMARY_CONFIDENCE:.3f}."
        )
        hard_fail = True

    if quality_score < OCR_MIN_QUALITY_SCORE:
        reasons.append(
            f"OCR quality score {quality_score:.2f} is below threshold {OCR_MIN_QUALITY_SCORE:.2f}."
        )
        hard_fail = True

    if effective_page_min < OCR_MIN_PAGE_CONFIDENCE:
        reasons.append(
            f"Minimum page confidence {effective_page_min:.3f} is below threshold {OCR_MIN_PAGE_CONFIDENCE:.3f}."
        )

    if raw_text_length < 30:
        reasons.append("Extracted text is too short. Document may be unreadable.")

    passes_threshold = not hard_fail

    if quality_score >= 85:
        quality_band = "HIGH"
    elif quality_score >= 65:
        quality_band = "MEDIUM"
    elif quality_score >= 45:
        quality_band = "LOW"
    else:
        quality_band = "VERY_LOW"

    return {
        "passes_threshold": passes_threshold,
        "quality_band": quality_band,
        "quality_score": quality_score,
        "primary_confidence": round(effective_primary, 4),
        "min_page_confidence": round(effective_page_min, 4),
        "mean_page_confidence": round(mean_page_confidence, 4) if mean_page_confidence is not None else None,
        "low_conf_token_ratio": round(low_conf_token_ratio, 4) if low_conf_token_ratio is not None else None,
        "raw_text_length": raw_text_length,
        "thresholds": {
            "min_primary_confidence": OCR_MIN_PRIMARY_CONFIDENCE,
            "min_page_confidence": OCR_MIN_PAGE_CONFIDENCE,
            "min_quality_score": OCR_MIN_QUALITY_SCORE,
        },
        "reasons": reasons,
        "stats": stats,
    }


def _light_upload_validation(
    raw_text: str,
    detected_doc_type: str,
    expected_doc_type: Optional[str] = None,
    ocr_quality_assessment: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    detected_doc_type = normalize_doc_type(detected_doc_type)
    expected_doc_type = normalize_doc_type(expected_doc_type) if expected_doc_type else None

    hard_fail_reasons: List[str] = []
    warnings: List[str] = []

    if len(raw_text.strip()) < 30:
        hard_fail_reasons.append(
            "Uploaded document appears blank, incomplete, or unreadable."
        )

    expected_document_match = True
    if expected_doc_type and expected_doc_type != "UNKNOWN":
        if detected_doc_type != expected_doc_type:
            expected_document_match = False
            hard_fail_reasons.append(
                f"Uploaded document does not match the expected document type '{expected_doc_type}'."
            )

    warnings.extend(_basic_identifier_presence_check(detected_doc_type, raw_text))

    if detected_doc_type in STANDARDISED_TEMPLATE_DOC_TYPES:
        warnings.extend(_basic_template_anchor_check(detected_doc_type, raw_text))

    if ocr_quality_assessment and not ocr_quality_assessment.get("passes_threshold", True):
        quality_score = ocr_quality_assessment.get("quality_score", 0)
        raw_text_length = ocr_quality_assessment.get("raw_text_length", 0)

        if raw_text_length < 30:
            if "Uploaded document appears blank, incomplete, or unreadable." not in hard_fail_reasons:
                hard_fail_reasons.append("Uploaded document appears blank, incomplete, or unreadable.")
        elif quality_score < OCR_MIN_QUALITY_SCORE:
            hard_fail_reasons.append("Document quality score is too low.")
        else:
            hard_fail_reasons.append("Document text could not be read clearly.")

    if (
        ocr_quality_assessment
        and ocr_quality_assessment.get("passes_threshold", True)
        and ocr_quality_assessment.get("quality_score", 100) < OCR_WARNING_THRESHOLD
    ):
        warnings.append("Document quality is moderate. Please verify the extracted information carefully.")

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
        "ocr_quality": ocr_quality_assessment,
    }

def _resolve_universal_parse_doc_type(detected_doc_type: str) -> str:
    normalized = normalize_doc_type(detected_doc_type)

    if normalized in DOCUMENT_SCHEMA_REGISTRY:
        return normalized

    if normalized == "ACRA" and "ACRA_BUSINESS_PROFILE" in DOCUMENT_SCHEMA_REGISTRY:
        return "ACRA_BUSINESS_PROFILE"

    return "UNKNOWN"


@router.post("/ocr-stats")
async def ocr_quality_only(file: UploadFile = File(...)):
    try:
        _, doc_ai_result, raw_text = await _run_initial_document_processing(file)

        ocr_quality_assessment = _build_ocr_quality_only_assessment(
            doc_ai_result=doc_ai_result,
            raw_text=raw_text,
        )

        return {
            "ocr_quality": ocr_quality_assessment,
            "ocr_confidence_stats": doc_ai_result.get("ocr_confidence_stats", {}),
        }

    except ValueError as ve:
        raise HTTPException(status_code=422, detail=f"Validation Error: {str(ve)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing Error: {str(e)}")


@router.post("/classify-and-extract")
async def classify_and_extract_document(
    file: UploadFile = File(...),
    expected_doc_type: str = Form(None)
):
    try:
        _, doc_ai_result, raw_text = await _run_initial_document_processing(file)

        detected_doc_type_raw = classify_document(raw_text)
        detected_doc_type = normalize_doc_type(detected_doc_type_raw)

        ocr_quality_assessment = _build_ocr_quality_assessment(
            doc_ai_result=doc_ai_result,
            raw_text=raw_text,
            detected_doc_type=detected_doc_type,
        )

        upload_validation = _light_upload_validation(
            raw_text=raw_text,
            detected_doc_type=detected_doc_type,
            expected_doc_type=expected_doc_type,
            ocr_quality_assessment=ocr_quality_assessment,
        )

        summarized_upload_validation = {
            "status": upload_validation.get("status"),
            "reasons": upload_validation.get("reasons", []),
            "ocr_quality": {
                "passes_threshold": ocr_quality_assessment.get("passes_threshold"),
                "quality_band": ocr_quality_assessment.get("quality_band"),
                "quality_score": ocr_quality_assessment.get("quality_score"),
            },
        }

        parse_doc_type = _resolve_universal_parse_doc_type(detected_doc_type_raw)
        is_supported = parse_doc_type != "UNKNOWN"

        if upload_validation["status"] == "FAIL":
            return {
                "document_type": parse_doc_type,
                "classified_as": detected_doc_type,
                "is_supported": is_supported,
                "upload_validation": summarized_upload_validation,
                "extraction_skipped": True,
                "data": {},
            }

        final_data = parse_universal_document(raw_text, parse_doc_type)

        return {
            "document_type": parse_doc_type,
            "classified_as": detected_doc_type,
            "is_supported": is_supported,
            "upload_validation": summarized_upload_validation,
            "extraction_skipped": False,
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

# @router.post("/universal-basic-info")
# async def extract_universal_basic_info(file: UploadFile = File(...)):
#     try:
#         _, doc_ai_result, raw_text = await _run_initial_document_processing(file)

#         detected_doc_type_raw = classify_business_document(raw_text)
#         detected_doc_type = normalize_doc_type(detected_doc_type_raw)

#         ocr_quality_assessment = _build_ocr_quality_assessment(
#             doc_ai_result=doc_ai_result,
#             raw_text=raw_text,
#             detected_doc_type=detected_doc_type,
#         )

#         upload_validation = _light_upload_validation(
#             raw_text=raw_text,
#             detected_doc_type=detected_doc_type,
#             ocr_quality_assessment=ocr_quality_assessment,
#         )

#         if upload_validation["status"] == "FAIL":
#             return {
#                 "filename": file.filename,
#                 "content_type": file.content_type,
#                 "document_type": detected_doc_type,
#                 "upload_validation": upload_validation,
#                 "ocr_confidence_stats": doc_ai_result.get("ocr_confidence_stats", {}),
#                 "extraction_skipped": True,
#                 "data": {},
#             }

#         if detected_doc_type not in BUSINESS_BASIC_INFO_DOC_TYPES:
#             raise HTTPException(
#                 status_code=400,
#                 detail="Only ACRA business profiles and Indonesian NIB documents are supported for basic autofill."
#             )

#         final_data = parse_basic_info_document(raw_text, detected_doc_type)

#         return {
#             "filename": file.filename,
#             "content_type": file.content_type,
#             "document_type": detected_doc_type,
#             "upload_validation": upload_validation,
#             "ocr_confidence_stats": doc_ai_result.get("ocr_confidence_stats", {}),
#             "extraction_skipped": False,
#             "data": final_data,
#         }

#     except ValueError as ve:
#         raise HTTPException(status_code=422, detail=f"Validation Error: {str(ve)}")
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Processing Error: {str(e)}")