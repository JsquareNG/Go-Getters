from pydantic import BaseModel
from typing import Any, Dict, List


class ManualReviewAIRequest(BaseModel):
    application_data: Dict[str, Any]
    triggered_rules: List[Dict[str, Any]]