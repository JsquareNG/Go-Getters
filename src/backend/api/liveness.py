import os
import requests
from fastapi import APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from pathlib import Path

# Load .env just in case this file is imported independently
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

router = APIRouter(prefix="/kyc", tags=["KYC Liveness"])

DIDIT_API_KEY = os.getenv("DIDIT_API_KEY")
DIDIT_URL = "https://verification.didit.me/v3/passive-liveness/"


@router.post("/liveness-check")
async def liveness_check(user_image: UploadFile = File(...)):
    if not DIDIT_API_KEY:
        raise HTTPException(status_code=500, detail="Missing DIDIT_API_KEY in .env")

    try:
        image_bytes = await user_image.read()

        files = {
            "user_image": (
                user_image.filename or "selfie.jpg",
                image_bytes,
                user_image.content_type or "image/jpeg",
            )
        }

        data = {
            "face_liveness_score_decline_threshold": "70",
            "rotate_image": "true",
            "save_api_request": "false",
            "vendor_data": "go-getters-test",
        }

        headers = {
            "x-api-key": DIDIT_API_KEY,
        }

        response = requests.post(
            DIDIT_URL,
            headers=headers,
            files=files,
            data=data,
            timeout=30,
        )

        # helpful for debugging
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.text
            )

        didit_result = response.json()

        liveness = didit_result.get("liveness", {})
        status = liveness.get("status")
        score = liveness.get("score", 0)
        warnings = liveness.get("warnings", [])
        face_quality = liveness.get("face_quality", 0)
        face_luminance = liveness.get("face_luminance", 0)

        # simple decision logic for testing
        if status == "Approved" and score >= 85 and face_quality >= 60 and not warnings:
            decision = "pass"
        elif status == "Approved":
            decision = "manual_review"
        else:
            decision = "reject"

        return {
            "decision": decision,
            "status": status,
            "score": score,
            "warnings": warnings,
            "face_quality": face_quality,
            "face_luminance": face_luminance,
            "raw_result": didit_result,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))