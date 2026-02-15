from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.services.id_verification.orchestrator import extract_and_validate

router = APIRouter(prefix="/idv", tags=["Identity Verification"])

@router.post("/extract-validate")
async def extract_validate(file: UploadFile = File(...)):
    if file.content_type not in ["application/pdf", "image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Only PDF, JPG, PNG allowed")

    file_bytes = await file.read()
    return extract_and_validate(file_bytes, file.content_type, file.filename)