import os
import requests
from fastapi import APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from pathlib import Path

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

router = APIRouter(prefix="/kyc", tags=["KYC Face Match"])

DIDIT_API_KEY = os.getenv("DIDIT_API_KEY")
DIDIT_FACE_MATCH_URL = "https://verification.didit.me/v3/face-match/"


@router.post("/face-match")
async def face_match(
    user_image: UploadFile = File(...),   # selfie
    ref_image: UploadFile = File(...),    # cropped NRIC portrait
):
    if not DIDIT_API_KEY:
        raise HTTPException(status_code=500, detail="Missing DIDIT_API_KEY in .env")

    try:
        user_bytes = await user_image.read()
        ref_bytes = await ref_image.read()

        files = {
            "user_image": (
                user_image.filename or "selfie.jpg",
                user_bytes,
                user_image.content_type or "image/jpeg",
            ),
            "ref_image": (
                ref_image.filename or "nric_face.jpg",
                ref_bytes,
                ref_image.content_type or "image/jpeg",
            ),
        }

        data = {
            "face_match_score_decline_threshold": "30",
            "rotate_image": "false",
            "save_api_request": "false",
            "vendor_data": "go-getters-face-match-test",
        }

        headers = {
            "x-api-key": DIDIT_API_KEY,
        }

        response = requests.post(
            DIDIT_FACE_MATCH_URL,
            headers=headers,
            files=files,
            data=data,
            timeout=30,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        didit_result = response.json()

        face_match_data = didit_result.get("face_match", {})
        status = face_match_data.get("status")
        score = face_match_data.get("score", 0)
        warnings = face_match_data.get("warnings", [])

        if status == "Approved" and score >= 80 and not warnings:
            decision = "pass"
        elif status == "Approved" and score >= 60:
            decision = "manual_review"
        else:
            decision = "reject"

        return {
            "decision": decision,
            "status": status,
            "score": score,
            "warnings": warnings,
            "raw_result": didit_result,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))