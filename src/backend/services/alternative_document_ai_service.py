import os
import json
from typing import List, Dict, Any
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is missing")

client = genai.Client(api_key=GEMINI_API_KEY)


# =========================
# RESPONSE SCHEMA (STRICT)
# =========================

class AlternativeDocumentOption(BaseModel):
    label: str
    value: str
    description: str | None = None


class RequestedDocumentAlternativeResult(BaseModel):
    item_id: str
    document_name: str
    alternative_document_options: List[AlternativeDocumentOption]


class BulkAlternativeDocumentAIResponse(BaseModel):
    results: List[RequestedDocumentAlternativeResult]


# =========================
# SYSTEM PROMPT
# =========================

SYSTEM_PROMPT = """
You are a bank compliance officer assisting with SME onboarding review.

Your task is to suggest alternative supporting documents for requested documents
when the SME cannot provide the original document.

-----------------------------------
IMPORTANT RULES
-----------------------------------

1. Be practical and realistic
- Suggest only documents that can reasonably serve the SAME verification purpose
- Do NOT suggest unrelated or generic documents

2. Avoid duplicates
- Do not repeat the same document within the same list
- Avoid suggesting identical alternatives across different requested documents

3. Avoid already submitted or already requested documents (CRITICAL)

- Do NOT suggest documents that are already present in the submitted documents list
- Do NOT suggest documents that are currently being requested in action_requests
- A document must NOT appear as an alternative to itself

- A document may only be suggested again if:
  • the existing version is likely invalid, inconsistent, or insufficient
  • an updated or clearer version is required

This rule is critical and must be strictly followed.

4. Be specific
- Avoid vague options like "Other Supporting Document"
- Prefer standard compliance documents (e.g. utility bill, tenancy agreement)

5. Limit suggestions
- Provide 2 to 5 alternatives per requested document
- If no good alternatives exist, return an empty list

6. Treat each requested document independently
- Each requested document should have its own alternatives
- Do NOT mix contexts across documents

7. Use full context
- Consider:
  • application data
  • risk assessment and triggered rules
  • submitted documents
  • past action requests

8. Do NOT hallucinate
- Only suggest realistic, commonly accepted documents in compliance/KYC

9. Output format must follow schema exactly

-----------------------------------
OUTPUT FORMAT
-----------------------------------

Return JSON with:

results: [
  {
    item_id: string,
    document_name: string,
    alternative_document_options: [
      {
        label: string,
        value: string,
        description: string (optional)
      }
    ]
  }
]

-----------------------------------
EXAMPLES
-----------------------------------

Requested: Proof of Address
GOOD:
- Utility Bill
- Tenancy Agreement
- Government Letter

BAD:
- Random unrelated documents
- Documents already submitted (unless justified)

-----------------------------------
FINAL INSTRUCTION
-----------------------------------

Be concise, practical, and compliance-focused.
"""


# =========================
# USER PROMPT BUILDER
# =========================

def build_user_prompt(
    requested_documents: List[Dict[str, Any]],
    application_data: Dict[str, Any],
    risk_assessment: Dict[str, Any],
    documents: List[Dict[str, Any]],
    action_requests: List[Dict[str, Any]],
) -> str:

    return f"""
You are generating alternative document options.

REQUESTED DOCUMENTS:
{json.dumps(requested_documents, indent=2, default=str)}

APPLICATION DATA:
{json.dumps(application_data, indent=2, default=str)}

RISK ASSESSMENT:
{json.dumps(risk_assessment, indent=2, default=str)}

SUBMITTED DOCUMENTS:
{json.dumps(documents, indent=2, default=str)}

PAST ACTION REQUESTS:
{json.dumps(action_requests, indent=2, default=str)}

Instructions:
- For EACH requested document, suggest appropriate alternative documents
- Ensure suggestions are relevant to the purpose of the requested document

- Do NOT suggest documents already present in the submitted documents list
- Do NOT suggest documents currently being requested in action_requests
- Do NOT suggest the same document as the requested document itself

- Avoid duplicate suggestions within a document
- Avoid repeating the same alternative across different requested documents unless clearly justified

- Return structured output
"""


# =========================
# MAIN SERVICE FUNCTION
# =========================

def generate_bulk_alternative_document_options(
    requested_documents: List[Dict[str, Any]],
    application_data: Dict[str, Any],
    risk_assessment: Dict[str, Any],
    documents: List[Dict[str, Any]],
    action_requests: List[Dict[str, Any]],
) -> dict:

    prompt = build_user_prompt(
        requested_documents=requested_documents,
        application_data=application_data,
        risk_assessment=risk_assessment,
        documents=documents,
        action_requests=action_requests,
    )

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=f"{SYSTEM_PROMPT}\n\n{prompt}",
        config={
            "response_mime_type": "application/json",
            "response_json_schema": BulkAlternativeDocumentAIResponse.model_json_schema(),
            "temperature": 0.3,
        },
    )

    parsed = BulkAlternativeDocumentAIResponse.model_validate_json(response.text)

    # =========================
    # POST-PROCESSING (IMPORTANT)
    # =========================

    # Remove duplicates & clean values
    # for doc in parsed.results:
    #     seen = set()
    #     filtered_options = []

    #     for opt in doc.alternative_document_options:
    #         key = opt.value.strip().lower()

    #         if key in seen:
    #             continue

    #         seen.add(key)
    #         filtered_options.append(opt)

    #     doc.alternative_document_options = filtered_options

    return parsed.model_dump()