import os
from typing import Optional, Tuple
from google.cloud import documentai

def detect_mime(upload_content_type: Optional[str], filename: Optional[str]) -> str:
    if upload_content_type in ("application/pdf", "image/jpeg", "image/png"):
        return upload_content_type

    if filename:
        f = filename.lower()
        if f.endswith(".pdf"):
            return "application/pdf"
        if f.endswith(".jpg") or f.endswith(".jpeg"):
            return "image/jpeg"
        if f.endswith(".png"):
            return "image/png"

    return "application/pdf"

def ocr_to_text(file_bytes: bytes, mime_type: str) -> Tuple[str, dict]:
    project_id = os.getenv("GCP_PROJECT_ID")
    location = os.getenv("GCP_LOCATION")
    processor_id = os.getenv("DOC_AI_OCR_PROCESSOR_ID")

    if not all([project_id, location, processor_id]):
        raise ValueError("Missing GCP OCR environment variables")

    client = documentai.DocumentProcessorServiceClient()
    name = client.processor_path(project_id, location, processor_id)

    request = documentai.ProcessRequest(
        name=name,
        raw_document=documentai.RawDocument(
            content=file_bytes,
            mime_type=mime_type,
        ),
    )

    result = client.process_document(request=request)
    doc = result.document

    text = doc.text or ""
    print("===== OCR TEXT START =====")
    print(text)
    print("===== OCR TEXT END =====")

    meta = {
        "mime_type": mime_type,
        "text_length": len(text),
        "pages": len(doc.pages) if doc.pages else 0,
        "processor": processor_id,
    }
    return text, meta