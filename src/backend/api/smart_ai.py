from fastapi import APIRouter, HTTPException
from backend.schemas.manual_review_ai import ManualReviewAIRequest
from backend.services.manual_review_ai_service import generate_manual_review_suggestions
from backend.schemas.alternative_document_ai import (
    BulkAlternativeDocumentAIRequest
)
from backend.services.alternative_document_ai_service import (
    generate_bulk_alternative_document_options,
)
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
    

@router.post("/alternative-documents")
def generate_bulk_alternative_documents(payload: BulkAlternativeDocumentAIRequest):
    try:
        result = generate_bulk_alternative_document_options(
            requested_documents=[doc.model_dump() for doc in payload.requested_documents],
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
        print("🔥 BULK ALTERNATIVE DOCUMENT AI ERROR:", str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))