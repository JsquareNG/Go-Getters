from fastapi import APIRouter, UploadFile, File, HTTPException

# services
from backend.services.document_ai import extract_acra_data_with_tables
from backend.services.id_verification.orchestrator import extract_and_validate

router = APIRouter(prefix="/extract", tags=["OCR Extraction"])


# ================================
# ACRA BUSINESS PROFILE EXTRACTION
# ================================
@router.post("/acra-bizprofile")
async def extract_acra(file: UploadFile = File(...)):
    try:
        pdf_bytes = await file.read()
        data = extract_acra_data_with_tables(pdf_bytes)

        return {
            "document_type": "ACRA_BIZPROFILE",
            "data": data
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ================================
# IDENTITY VERIFICATION EXTRACTION
# ================================
@router.post("/id")
async def extract_id(file: UploadFile = File(...)):

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

    result = extract_and_validate(
        file_bytes,
        file.content_type,
        file.filename
    )

    return {
        "document_type": "IDENTITY_DOCUMENT",
        "data": result
    }