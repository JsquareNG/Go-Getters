from fastapi import APIRouter, HTTPException
from backend.schemas.manual_review_ai import ManualReviewAIRequest
from backend.services.manual_review_ai_service import generate_manual_review_suggestions

router = APIRouter(prefix="/manual-review-ai", tags=["manual-review-ai"])


@router.post("/generate")
def generate_ai_suggestions(payload: ManualReviewAIRequest):
    try:
        result = generate_manual_review_suggestions(
            application_data=payload.application_data,
            triggered_rules=payload.triggered_rules,
        )
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))