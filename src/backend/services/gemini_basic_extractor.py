import json
import os
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig
from backend.models.basic_extract import BASIC_INFO_SCHEMA_REGISTRY

project_id = os.getenv("GCP_PROJECT_ID")
vertex_location = "asia-southeast1"
vertexai.init(project=project_id, location=vertex_location)


def classify_business_document(raw_text: str) -> str:
    """
    Classify only business registration documents for autofill purposes.
    Expected outputs: ACRA, NIB, UNKNOWN
    """
    model = GenerativeModel("gemini-2.5-flash")

    prompt = f"""
    You are a document classification engine for a bank onboarding platform.

    Classify the OCR text into EXACTLY ONE of these values:
    - ACRA
    - NIB
    - UNKNOWN

    Rules:
    - If the text contains "ACCOUNTING AND CORPORATE REGULATORY AUTHORITY", "ACRA",
      "Business Profile", "Entity Name", "UEN", classify as ACRA.
    - If the text contains "Nomor Induk Berusaha", "NIB", "NPWP",
      "Badan Koordinasi Penanaman Modal", classify as NIB.
    - If not confident, return UNKNOWN.

    Return STRICTLY one word only: ACRA, NIB, or UNKNOWN.

    OCR TEXT:
    {raw_text[:4000]}
    """

    response = model.generate_content(prompt)
    result = response.text.strip().upper()

    if result not in {"ACRA", "NIB", "UNKNOWN"}:
        return "UNKNOWN"

    print("\n" + "=" * 40)
    print(f"🤖 BASIC DOC CLASSIFICATION RESULT: {result}")
    print(f"📄 FIRST 500 CHARS OF OCR TEXT:\n{raw_text[:500]}")
    print("=" * 40 + "\n")

    return result


def parse_basic_info_document(raw_text: str, doc_type: str) -> dict:
    """
    Extract only basic autofill information from ACRA or NIB.
    """
    doc_type_upper = doc_type.upper()

    if doc_type_upper not in BASIC_INFO_SCHEMA_REGISTRY:
        supported = ", ".join(BASIC_INFO_SCHEMA_REGISTRY.keys())
        raise ValueError(
            f"Unsupported basic info document type: {doc_type}. Supported: {supported}"
        )

    TargetSchemaClass = BASIC_INFO_SCHEMA_REGISTRY[doc_type_upper]
    schema_instructions = json.dumps(TargetSchemaClass.model_json_schema(), indent=2)

    model = GenerativeModel("gemini-2.5-flash")
    config = GenerationConfig(response_mime_type="application/json")

    prompt = f"""
    You are an expert business onboarding extraction AI for a bank.

    Your task is to extract ONLY the BASIC INFORMATION needed to autofill a frontend onboarding form.

    DOCUMENT TYPE: {doc_type_upper}

    Return STRICTLY valid JSON that follows this schema exactly:
    {schema_instructions}

    General rules:
    - Do not include markdown, explanations, or notes.
    - If a value is missing, return empty string, empty list, or null as appropriate.
    - Preserve names and addresses as faithfully as possible from OCR.
    - Normalize obvious OCR formatting issues where safe.
    - Do not invent data.

    Additional extraction rules for ACRA:
    - Extract entity_type if visible.
    - business_status may come from entity status / live status / registration status.
    - For SOLE_PROPRIETORSHIP: fill owner.
    - For GENERAL_PARTNERSHIP: fill partners.
    - For LIMITED_PARTNERSHIP: fill general_partners and limited_partners.
    - For LLP: fill partners and managers.
    - For PRIVATE_LIMITED_COMPANY: fill directors and shareholders.
    - shareholders:
      - If person, shareholder_type = "INDIVIDUAL"
      - If company, shareholder_type = "CORPORATE"
      - Put percentage into share_percentage if available.
    - Do not force empty objects into unrelated sections; use empty lists or null.

    Additional extraction rules for NIB:
    - business_registration_number = NIB number
    - business_activities should be a list
    - include NPWP if present
    - extract email and phone if present

    RAW OCR TEXT:
    {raw_text}
    """

    response = model.generate_content(prompt, generation_config=config)

    validated_data = TargetSchemaClass.model_validate_json(response.text)
    return validated_data.model_dump()