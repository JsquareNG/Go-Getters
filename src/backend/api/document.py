from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
import os

from backend.database import SessionLocal
from backend.models.documents import Document
from backend.services.supabase_client import supabase, supabase_admin, BUCKET

router = APIRouter(prefix="/documents", tags=["documents"])
SUPABASE_URL = os.getenv("SUPABASE_URL")

# -----------------------------
# DB dependency
# -----------------------------
# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()

# -----------------------------
# Config: required doc types
# Replace these with your real 3 required document_type strings
# -----------------------------
REQUIRED_TYPES = {"bank_statement", "business_registration", "directors_info"}


# -----------------------------
# Storage path builders
# -----------------------------
def required_storage_path(application_id: str, document_type: str) -> str:
    # 1 file per required type (overwrite if re-upload)
    return f"applications/{application_id}/{document_type}.pdf"

def supporting_storage_path(application_id: str, index: int) -> str:
    # supporting_1, supporting_2, ...
    return f"applications/{application_id}/supporting_{index}.pdf"

def next_supporting_index(db: Session, application_id: str) -> int:
    # Count existing supporting docs for this application, then +1
    count = (
        db.query(func.count(Document.document_id))
        .filter(
            Document.application_id == application_id,
            Document.document_type == "supporting",
        )
        .scalar()
    )
    return (count or 0) + 1

# -----------------------------
# Schemas
# -----------------------------
class InitPersistUploadIn(BaseModel):
    application_id: str
    document_type: str  # required type OR "supporting" (or any non-required)
    filename: str
    mime_type: str = "application/pdf"

class ConfirmPersistUploadIn(BaseModel):
    document_id: str

# -----------------------------
# Routes
# -----------------------------
@router.post("/init-persist-upload")
def init_persist_upload(payload: InitPersistUploadIn, db: Session = Depends(get_db)):
    if payload.mime_type != "application/pdf":
        raise HTTPException(400, "Only PDF supported")

    is_required = payload.document_type in REQUIRED_TYPES

    if is_required:
        # Required doc: upsert 1 row per (application_id, document_type) + fixed path
        path = required_storage_path(payload.application_id, payload.document_type)

        doc = (
            db.query(Document)
            .filter(
                Document.application_id == payload.application_id,
                Document.document_type == payload.document_type,
            )
            .first()
        )

        if doc:
            doc.storage_path = path
            doc.original_filename = payload.filename
            doc.mime_type = payload.mime_type
            doc.status = "uploading"
        else:
            doc = Document(
                application_id=payload.application_id,
                document_type=payload.document_type,
                storage_path=path,
                original_filename=payload.filename,
                mime_type=payload.mime_type,
                status="uploading",
            )
            db.add(doc)

    else:
        # Supporting doc: ALWAYS new row + supporting_N naming
        index = next_supporting_index(db, payload.application_id)
        path = supporting_storage_path(payload.application_id, index)

        doc = Document(
            application_id=payload.application_id,
            document_type="supporting",
            storage_path=path,
            original_filename=payload.filename,
            mime_type=payload.mime_type,
            status="uploading",
        )
        db.add(doc)

    db.commit()
    db.refresh(doc)

    signed = supabase.storage.from_(BUCKET).create_signed_upload_url(path)
    if not signed:
        raise HTTPException(500, "Failed to create signed upload URL")

    return {
        "document_id": doc.document_id,
        "storage_path": path,
        "signed_upload": signed
    }

@router.post("/confirm-persist-upload")
def confirm_persist_upload(payload: ConfirmPersistUploadIn, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.document_id == payload.document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    doc.status = "uploaded"
    db.commit()
    return {"ok": True}

@router.get("/by-application/{application_id}")
def list_docs(application_id: str, db: Session = Depends(get_db)):
    docs = (
        db.query(Document)
        .filter(Document.application_id == application_id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [
        {
            "document_id": d.document_id,
            "document_type": d.document_type,
            "storage_path": d.storage_path,
            "status": d.status,
            "original_filename": getattr(d, "original_filename", None),
            "mime_type": getattr(d, "mime_type", None),
            "created_at": d.created_at,
        }
        for d in docs
    ]

# get url for specific document
@router.get("/download-url/{application_id}/{document_type}")
def get_download_url(application_id: str, document_type: str, db: Session = Depends(get_db)):
    doc = (
        db.query(Document)
        .filter(
            Document.application_id == application_id,
            Document.document_type == document_type,
            Document.status == "uploaded",
        )
        .order_by(Document.created_at.desc())
        .first()
    )
    if not doc:
        raise HTTPException(404, "No uploaded document found")

    signed = supabase.storage.from_(BUCKET).create_signed_url(doc.storage_path, 300)
    if not signed:
        raise HTTPException(500, "Failed to create signed download URL")

    return {"signed_download": signed}

# get url for any document
# @router.get("/download-url/{document_id}")
# def get_download_url_by_id(document_id: str, db: Session = Depends(get_db)):
#     doc = (
#         db.query(Document)
#         .filter(
#             Document.document_id == document_id,
#             Document.status == "uploaded",
#         )
#         .first()
#     )
#     if not doc:
#         raise HTTPException(404, "No uploaded document found")

#     path = doc.storage_path

#     # ✅ 1) verify object exists in bucket (using admin)
#     bucket_admin = supabase_admin.storage.from_(BUCKET)

#     folder = "/".join(path.split("/")[:-1])
#     filename = path.split("/")[-1]

#     try:
#         items = bucket_admin.list(path=folder)
#     except TypeError:
#         items = bucket_admin.list(folder)

#     exists = any((x.get("name") == filename) for x in (items or []))
#     if not exists:
#         raise HTTPException(
#             404,
#             f"File exists in DB but NOT in storage. bucket={BUCKET} path={path}"
#         )

#     # ✅ 2) create signed URL (use anon client)
#     signed = supabase.storage.from_(BUCKET).create_signed_url(path, 300)

#     # ✅ normalize output to a single url string
#     url = None
#     if isinstance(signed, dict):
#         url = signed.get("signedURL") or signed.get("signedUrl") or signed.get("url")
#     elif isinstance(signed, str):
#         url = signed

#     if not url:
#         raise HTTPException(500, f"Unexpected signed url response: {signed}")

#     return {"url": url, "bucket": BUCKET, "path": path}

@router.get("/download-url/{document_id}")
def get_download_url_by_id(document_id: str, db: Session = Depends(get_db)):
    doc = (
        db.query(Document)
        .filter(Document.document_id == document_id, Document.status == "uploaded")
        .first()
    )
    if not doc:
        raise HTTPException(404, "No uploaded document found")

    path = doc.storage_path

    signed = supabase_admin.storage.from_(BUCKET).create_signed_url(path, 300)

    url = None
    if isinstance(signed, dict):
        url = signed.get("signedURL") or signed.get("signedUrl") or signed.get("url")
    elif isinstance(signed, str):
        url = signed

    if not url:
        raise HTTPException(500, f"Unexpected signed url response: {signed}")

    return {"url": url}


@router.post("/replace-upload/{document_id}")
def replace_upload(document_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if file.content_type != "application/pdf":
        raise HTTPException(400, "Only PDF supported")

    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    content = file.file.read()
    if not content:
        raise HTTPException(400, "Empty file")

    path = doc.storage_path

    bucket = supabase_admin.storage.from_(BUCKET)

    # 1) Delete old file first (ignore if it doesn't exist)
    try:
        bucket.remove([path])
    except Exception:
        # Some SDK versions raise if missing; safe to ignore for replace
        pass

    # 2) Upload new file (no upsert)
    try:
        # Newer versions accept kwargs
        bucket.upload(
            path=path,
            file=content,
            file_options={"content-type": "application/pdf"},
        )
    except TypeError:
        # Older versions accept positional args
        bucket.upload(
            path,
            content,
            {"content-type": "application/pdf"},
        )

    # 3) Update DB after storage success
    doc.original_filename = file.filename
    doc.mime_type = "application/pdf"
    doc.status = "uploaded"
    db.commit()

    return {"ok": True, "document_id": document_id}

@router.get("/download-url/{document_id}")
def get_download_url_by_id(document_id: str, db: Session = Depends(get_db)):
    doc = (
        db.query(Document)
        .filter(Document.document_id == document_id, Document.status == "uploaded")
        .first()
    )
    if not doc:
        raise HTTPException(404, "No uploaded document found")

    path = doc.storage_path

    signed = supabase_admin.storage.from_(BUCKET).create_signed_url(path, 300)

    url = None
    if isinstance(signed, dict):
        url = signed.get("signedURL") or signed.get("signedUrl") or signed.get("url")
    elif isinstance(signed, str):
        url = signed

    if not url:
        raise HTTPException(500, f"Unexpected signed url response: {signed}")

    return {"url": url}


@router.delete("/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    # ✅ Only allow deleting supporting docs
    if doc.document_type != "supporting":
        raise HTTPException(400, "Only supporting documents can be deleted")

    path = doc.storage_path

    # ✅ Delete from storage first (service role bypasses policies)
    # storage3 remove expects a list of paths in most versions
    try:
        supabase_admin.storage.from_(BUCKET).remove([path])
    except TypeError:
        # some versions accept a single string
        supabase_admin.storage.from_(BUCKET).remove(path)

    # ✅ Then delete from DB
    db.delete(doc)
    db.commit()

    return {"ok": True, "deleted_document_id": document_id, "deleted_path": path}