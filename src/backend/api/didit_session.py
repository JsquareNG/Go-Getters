import os
import requests
from pathlib import Path
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request, Depends, status
from pydantic import BaseModel

from backend.auth.dependencies import get_current_user

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

router = APIRouter(prefix="/didit", tags=["Didit"])

DIDIT_API_KEY = os.getenv("DIDIT_API_KEY")
DIDIT_WORKFLOW_ID = os.getenv("DIDIT_WORKFLOW_ID")
DIDIT_CREATE_SESSION_URL = "https://verification.didit.me/v3/session/"


# UPDATED: added callback_url
class CreateSessionRequest(BaseModel):
    application_id: str | None = None
    user_id: str | None = None
    callback_url: str | None = None


# =====================================================
# Auth helpers
# =====================================================

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


def _ensure_authenticated(current_user: dict):
    _current_user_id(current_user)


def _ensure_staff_or_management(current_user: dict):
    role = _current_user_role(current_user)
    if role not in {"STAFF", "MANAGEMENT"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden",
        )


# =====================================================
# Create session
# =====================================================

@router.post("/create-session")
def create_didit_session(
    payload: CreateSessionRequest,
    current_user: dict = Depends(get_current_user),
):
    _ensure_authenticated(current_user)

    if not DIDIT_API_KEY:
        raise HTTPException(status_code=500, detail="Missing DIDIT_API_KEY")
    if not DIDIT_WORKFLOW_ID:
        raise HTTPException(status_code=500, detail="Missing DIDIT_WORKFLOW_ID")

    headers = {
        "x-api-key": DIDIT_API_KEY,
        "Content-Type": "application/json",
        "accept": "application/json",
    }

    # Do not trust user_id from client payload.
    # Always bind metadata user_id to the logged-in user.
    current_user_id = _current_user_id(current_user)

    body = {
        "workflow_id": DIDIT_WORKFLOW_ID,
        "callback": payload.callback_url or "http://localhost:5173/application/edit/new/1",
        "metadata": {
            "user_id": current_user_id
        }
    }

    if payload.application_id:
        body["vendor_data"] = payload.application_id

    try:
        response = requests.post(
            DIDIT_CREATE_SESSION_URL,
            headers=headers,
            json=body,
            timeout=30,
        )

        print("Didit create-session request body:", body)
        print("Didit response status:", response.status_code)
        print("Didit response text:", response.text)

        if response.status_code not in (200, 201):
            raise HTTPException(status_code=response.status_code, detail=response.text)

        data = response.json()

        return {
            "session_id": data.get("session_id") or data.get("id"),
            "verification_url": data.get("verification_url") or data.get("url"),
            "raw": data,
        }

    except HTTPException:
        raise

    except Exception as e:
        print("Create session error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# Get session decision
# =====================================================

@router.get("/session/{session_id}/decision")
def get_session_decision(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    # Decision details are sensitive.
    # Restrict to internal roles only.
    _ensure_staff_or_management(current_user)

    if not DIDIT_API_KEY:
        raise HTTPException(status_code=500, detail="Missing DIDIT_API_KEY")

    headers = {
        "x-api-key": DIDIT_API_KEY,
        "accept": "application/json",
    }

    url = f"https://verification.didit.me/v3/session/{session_id}/decision/"
    response = requests.get(url, headers=headers, timeout=30)

    print("Didit decision status:", response.status_code)
    print("Didit decision text:", response.text)

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return response.json()


# =====================================================
# Webhook
# =====================================================

@router.post("/webhook")
async def didit_webhook(request: Request):
    payload = await request.json()

    print("Didit webhook received:", payload)

    session_id = payload.get("session_id")
    status_value = payload.get("status")

    print("Session:", session_id)
    print("Verification status:", status_value)

    return {"ok": True}