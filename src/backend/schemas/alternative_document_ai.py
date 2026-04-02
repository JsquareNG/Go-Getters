from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional



class RequestedDocumentContext(BaseModel):
    item_id: str = Field(..., description="Unique action-request item ID for the requested document")
    document_name: str = Field(..., description="Name of the requested document")
    document_desc: Optional[str] = Field(
        default=None,
        description="Optional description shown to the SME for this requested document",
    )


class AlternativeDocumentOption(BaseModel):
    label: str = Field(..., description="Frontend display label for the alternative document")
    value: str = Field(..., description="Stored value for the selected alternative document")
    description: str = Field(
        ...,
        description="Short explanation of what this alternative document should contain and why it may be acceptable",
    )


class RequestedDocumentAlternativeResult(BaseModel):
    item_id: str = Field(..., description="Requested document item ID")
    document_name: str = Field(..., description="Original requested document name")
    alternative_document_options: List[AlternativeDocumentOption] = Field(
        default_factory=list,
        description="Suggested alternative documents for this requested document",
    )


class BulkAlternativeDocumentAIRequest(BaseModel):
    requested_documents: List[RequestedDocumentContext]
    application_data: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    documents: List[Dict[str, Any]]
    action_requests: List[Dict[str, Any]]


class BulkAlternativeDocumentAIResponse(BaseModel):
    results: List[RequestedDocumentAlternativeResult]