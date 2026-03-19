import os
import requests
from pathlib import Path
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

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


@router.post("/create-session")
def create_didit_session(payload: CreateSessionRequest):
    if not DIDIT_API_KEY:
        raise HTTPException(status_code=500, detail="Missing DIDIT_API_KEY")
    if not DIDIT_WORKFLOW_ID:
        raise HTTPException(status_code=500, detail="Missing DIDIT_WORKFLOW_ID")

    headers = {
        "x-api-key": DIDIT_API_KEY,
        "Content-Type": "application/json",
        "accept": "application/json",
    }

    # UPDATED: callback now dynamic
    body = {
        "workflow_id": DIDIT_WORKFLOW_ID,
        "callback": payload.callback_url or "http://localhost:5173/application/edit/new/1"
    }

    if payload.application_id:
        body["vendor_data"] = payload.application_id

    if payload.user_id:
        body["metadata"] = {
            "user_id": payload.user_id
        }

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


@router.get("/session/{session_id}/decision")
def get_session_decision(session_id: str):
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


@router.post("/webhook")
async def didit_webhook(request: Request):
    payload = await request.json()

    print("Didit webhook received:", payload)

    session_id = payload.get("session_id")
    status = payload.get("status")

    print("Session:", session_id)
    print("Verification status:", status)

    return {"ok": True}