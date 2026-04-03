from pydantic import BaseModel
from typing import Any, Dict, List


class ManualReviewAIRequest(BaseModel):
    application_data: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    documents: List[Dict[str, Any]]
    action_requests: List[Dict[str, Any]]

    