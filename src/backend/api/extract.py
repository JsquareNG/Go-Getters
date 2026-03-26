from fastapi import APIRouter, UploadFile, File, HTTPException
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


@router.post("/classify-and-extract")
async def classify_and_extract_document(file: UploadFile = File(...)):
    try:
        # 1. Validate file type
        if file.content_type not in SUPPORTED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Only PDF, JPG, PNG allowed"
            )

        # 2. Read file once
        file_bytes = await file.read()

        # 3. OCR once
        doc_ai_result = extract_document_layout(file_bytes, file.content_type)
        raw_text = doc_ai_result.get("raw_text", "")

        if not raw_text:
            raise HTTPException(
                status_code=400,
                detail="Document AI extracted no text."
            )

        # 4. Classify once
        detected_doc_type = classify_document(raw_text)
        is_supported = detected_doc_type != "UNKNOWN"

        # 5. Prepare base response
        response = {
            "filename": file.filename,
            "content_type": file.content_type,
            "document_type": detected_doc_type,
            "is_supported": is_supported,
            "data": None,
        }

       # 6. Extract structured info for both supported and unknown documents
        parse_doc_type = detected_doc_type if detected_doc_type in DOCUMENT_SCHEMA_REGISTRY else "UNKNOWN"
        final_data = parse_universal_document(raw_text, parse_doc_type)

        # 7. Return all in one response
        response["data"] = final_data
        return response


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
        if file.content_type not in [
            "application/pdf",
            "image/jpeg",
            "image/png"
        ]:
            raise HTTPException(
                status_code=400,
                detail="Only PDF, JPG, PNG allowed"
            )

        file_bytes = await file.read()

        doc_ai_result = extract_document_layout(file_bytes, file.content_type)
        raw_text = doc_ai_result.get("raw_text", "")

        if not raw_text:
            raise HTTPException(
                status_code=400,
                detail="Document AI extracted no text."
            )

        detected_doc_type = classify_business_document(raw_text)

        if detected_doc_type == "UNKNOWN":
            raise HTTPException(
                status_code=400,
                detail="Only ACRA business profiles and Indonesian NIB documents are supported for basic autofill."
            )

        final_data = parse_basic_info_document(raw_text, detected_doc_type)

        return {
            "document_type": detected_doc_type,
            "data": final_data
        }

    except ValueError as ve:
        raise HTTPException(status_code=422, detail=f"Validation Error: {str(ve)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing Error: {str(e)}")

