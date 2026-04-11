from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, Dict, Any
import mimetypes
import os

from backend.auth.dependencies import get_current_user
from backend.database import get_db
from backend.models.documents import Document
from backend.models.application import ApplicationForm
from backend.services.supabase_client import supabase, supabase_admin, BUCKET

router = APIRouter(prefix="/documents", tags=["documents"])
SUPABASE_URL = os.getenv("SUPABASE_URL")

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
}
MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


# -----------------------------
# Storage path builders
# -----------------------------
def required_storage_path(application_id: str, document_type: str, mime_type: str) -> str:
    ext = mimetypes.guess_extension(mime_type) or ".bin"
    return f"applications/{application_id}/{document_type}{ext}"


def supporting_storage_path(application_id: str, index: int) -> str:
    return f"applications/{application_id}/supporting_{index}.pdf"


def next_supporting_index(db: Session, application_id: str) -> int:
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
    document_type: str
    filename: str
    mime_type: str = "application/pdf"
    extracted_data: Optional[Dict[str, Any]] = None


class ConfirmPersistUploadIn(BaseModel):
    document_id: str


# -----------------------------
# Auth / authorization helpers
# -----------------------------
def _current_user_id(current_user: dict) -> str:
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return user_id


def _current_user_role(current_user: dict) -> str:
    role = current_user.get("role")
    if not role:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return str(role).upper().strip()


def _get_application_or_404(db: Session, application_id: str) -> ApplicationForm:
    app = (
        db.query(ApplicationForm)
        .filter(ApplicationForm.application_id == application_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


def _get_document_or_404(db: Session, document_id: str) -> Document:
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


def _ensure_application_access(app: ApplicationForm, current_user: dict):
    role = _current_user_role(current_user)
    user_id = _current_user_id(current_user)

    if role == "SME":
        if app.user_id != user_id:
            raise HTTPException(status_code=403, detail="Forbidden")
        return

    if role in {"STAFF", "MANAGEMENT"}:
        return

    raise HTTPException(status_code=403, detail="Forbidden")


def _ensure_application_owner(app: ApplicationForm, current_user: dict):
    role = _current_user_role(current_user)
    user_id = _current_user_id(current_user)

    if role != "SME":
        raise HTTPException(status_code=403, detail="Forbidden")

    if app.user_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


def _ensure_document_access(doc: Document, db: Session, current_user: dict) -> ApplicationForm:
    app = _get_application_or_404(db, doc.application_id)
    _ensure_application_access(app, current_user)
    return app


def _validate_init_payload(payload: InitPersistUploadIn):
    if payload.mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Only PDF, JPG, PNG allowed.",
        )


def _validate_upload_file(file: UploadFile, content: bytes):
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large")

    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Only PDF, JPG, PNG allowed.",
        )


# -----------------------------
# Routes
# -----------------------------
@router.post("/init-persist-upload")
def init_persist_upload(
    payload: InitPersistUploadIn,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _validate_init_payload(payload)

    app = _get_application_or_404(db, payload.application_id)
    _ensure_application_access(app, current_user)

    path = required_storage_path(
        payload.application_id,
        payload.document_type,
        payload.mime_type,
    )

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
        doc.extracted_data = payload.extracted_data or {}
    else:
        doc = Document(
            application_id=payload.application_id,
            document_type=payload.document_type,
            storage_path=path,
            original_filename=payload.filename,
            mime_type=payload.mime_type,
            status="uploading",
            extracted_data=payload.extracted_data or {},
        )
        db.add(doc)

    db.commit()
    db.refresh(doc)

    signed = supabase.storage.from_(BUCKET).create_signed_upload_url(path)
    if not signed:
        raise HTTPException(status_code=500, detail="Failed to create signed upload URL")

    return {
        "document_id": doc.document_id,
        "storage_path": path,
        "signed_upload": signed,
    }


@router.post("/confirm-persist-upload")
def confirm_persist_upload(
    payload: ConfirmPersistUploadIn,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    doc = _get_document_or_404(db, payload.document_id)
    _ensure_document_access(doc, db, current_user)

    doc.status = "uploaded"
    db.commit()
    return {"ok": True}


@router.get("/by-application/{application_id}")
def list_docs(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    app = _get_application_or_404(db, application_id)
    _ensure_application_access(app, current_user)

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


@router.post("/replace-upload/{document_id}")
def replace_upload(
    document_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    doc = _get_document_or_404(db, document_id)
    _ensure_document_access(doc, db, current_user)

    content = file.file.read()
    _validate_upload_file(file, content)

    bucket = supabase_admin.storage.from_(BUCKET)
    ct = file.content_type or "application/octet-stream"

    guessed_ext = mimetypes.guess_extension(ct) or ""
    if guessed_ext:
        base, _old_ext = os.path.splitext(doc.storage_path)
        new_path = base + guessed_ext
    else:
        new_path = doc.storage_path

    try:
        bucket.remove([doc.storage_path])
    except Exception:
        pass

    if new_path != doc.storage_path:
        try:
            bucket.remove([new_path])
        except Exception:
            pass

    try:
        bucket.upload(
            path=new_path,
            file=content,
            file_options={"content-type": ct},
        )
    except TypeError:
        bucket.upload(
            new_path,
            content,
            {"content-type": ct},
        )

    doc.storage_path = new_path
    doc.original_filename = file.filename
    doc.mime_type = ct
    doc.status = "uploaded"
    db.commit()

    return {
        "ok": True,
        "document_id": document_id,
        "storage_path": new_path,
        "mime_type": ct,
    }


@router.get("/download-url/{document_id}")
def get_download_url_by_id(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    doc = (
        db.query(Document)
        .filter(Document.document_id == document_id, Document.status == "uploaded")
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="No uploaded document found")

    _ensure_document_access(doc, db, current_user)

    path = doc.storage_path
    signed = supabase_admin.storage.from_(BUCKET).create_signed_url(path, 300)

    url = None
    if isinstance(signed, dict):
        url = signed.get("signedURL") or signed.get("signedUrl") or signed.get("url")
    elif isinstance(signed, str):
        url = signed

    if not url:
        raise HTTPException(status_code=500, detail=f"Unexpected signed url response: {signed}")

    return {"url": url}


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    doc = _get_document_or_404(db, document_id)
    app = _ensure_document_access(doc, db, current_user)

    if doc.document_type != "supporting":
        raise HTTPException(status_code=400, detail="Only supporting documents can be deleted")

    # optional stricter rule: only SME owner can delete supporting docs
    _ensure_application_owner(app, current_user)

    path = doc.storage_path

    try:
        supabase_admin.storage.from_(BUCKET).remove([path])
    except TypeError:
        supabase_admin.storage.from_(BUCKET).remove(path)

    db.delete(doc)
    db.commit()

    return {
        "ok": True,
        "deleted_document_id": document_id,
        "deleted_path": path,
    }