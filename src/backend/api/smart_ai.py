from fastapi import APIRouter, HTTPException
from backend.schemas.manual_review_ai import ManualReviewAIRequest
from backend.services.manual_review_ai_service import generate_manual_review_suggestions
import traceback

router = APIRouter(prefix="/manual-review-ai", tags=["manual-review-ai"])


@router.post("/generate")
def generate_ai_suggestions(payload: ManualReviewAIRequest):
    try:
        result = generate_manual_review_suggestions(
            application_data=payload.application_data,
            risk_assessment=payload.risk_assessment,
            documents=payload.documents,
            action_requests=payload.action_requests,
        )
        return {
            "success": True,
            "data": result,
        }
    except Exception as e:
        # raise HTTPException(status_code=500, detail=str(e))
            print("🔥 AI GENERATION ERROR:", str(e))
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))