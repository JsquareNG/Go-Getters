from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from backend.services.document_ai import extract_acra_data

router = APIRouter(prefix="/document-ai", tags=["Document AI"])


@router.post("/extract-acra")
async def extract_acra(
    entity_type: str = Form(...),  # 👈 REQUIRED
    file: UploadFile = File(...)
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF allowed")

    pdf_bytes = await file.read()

    try:
        extracted = extract_acra_data(pdf_bytes, entity_type)
        return {
            "success": True,
            "data": extracted
        }
    except ValueError as e:
        # validation error (entity mismatch)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))