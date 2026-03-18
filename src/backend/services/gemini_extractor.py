import json
import os
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig
from backend.models.extract import DOCUMENT_SCHEMA_REGISTRY

# Initialize Vertex AI
project_id = os.getenv("GCP_PROJECT_ID") 
vertex_location = 'asia-southeast1'
vertexai.init(project=project_id, location=vertex_location)

def classify_document(raw_text: str) -> str:
    supported_types = list(DOCUMENT_SCHEMA_REGISTRY.keys())
    model = GenerativeModel("gemini-2.5-flash")

    prompt = f"""
    You are a document classification engine for a bank.
    Look at the following OCR text and identify the document type.

    Supported types: {supported_types}

    Rules:
    - If the text contains "Nomor Induk Berusaha", "NIB", or "Badan Koordinasi Penanaman Modal", reply STRICTLY with: NIB
    - If the text looks like a bank transaction history or bank statement, reply STRICTLY with: BANK_STATEMENT
    - If the text contains "ACCOUNTING AND CORPORATE REGULATORY AUTHORITY" or "ACRA", reply STRICTLY with: ACRA

    Proof of Address rules:
    - If the text looks like a household/business utility bill (electricity, water, gas, telecom, broadband, internet), reply STRICTLY with: UTILITY_BILL
    - If the text looks like a tenancy agreement between landlord and tenant, reply STRICTLY with: TENANCY_AGREEMENT
    - If the text looks like a commercial office/shop/business premises lease, reply STRICTLY with: OFFICE_LEASE

    Classification hints:
    - Utility bills often contain words like: bill, statement date, account number, meter, electricity, water, gas, SP Services, utility, due date
    - Tenancy agreements often contain words like: tenancy agreement, landlord, tenant, rental, premises, term, commencement date
    - Office leases often contain words like: lease agreement, lessor, lessee, office premises, unit number, commercial space, monthly rent

    - You MUST reply STRICTLY with EXACTLY ONE of the supported types.
    - If it is completely unrecognizable, reply STRICTLY with: UNKNOWN

    OCR TEXT:
    {raw_text[:3000]}
    """

    response = model.generate_content(prompt)
    result = response.text.strip().upper()

    print("\n" + "="*40)
    print(f"🤖 AI CLASSIFICATION RESULT: {result}")
    print(f"📄 FIRST 500 CHARS OF OCR TEXT:\n{raw_text[:500]}")
    print("="*40 + "\n")

    return result

def parse_universal_document(raw_text: str, doc_type: str) -> dict:
    doc_type_upper = doc_type.upper()

    if doc_type_upper not in DOCUMENT_SCHEMA_REGISTRY:
        supported = ", ".join(DOCUMENT_SCHEMA_REGISTRY.keys())
        raise ValueError(f"Unsupported document type: {doc_type}. Supported: {supported}")

    TargetSchemaClass = DOCUMENT_SCHEMA_REGISTRY[doc_type_upper]
    schema_instructions = json.dumps(TargetSchemaClass.model_json_schema(), indent=2)

    model = GenerativeModel("gemini-2.5-flash")
    config = GenerationConfig(response_mime_type="application/json")

    prompt = f"""
    You are an expert KYC compliance AI for a bank.
    Analyze the following raw OCR text extracted from a {doc_type_upper} document.

    Extract the data and format it STRICTLY according to this JSON schema:
    {schema_instructions}

    Extraction rules:
    - Return valid JSON only
    - If a field is missing, return empty string, null, or empty list as appropriate
    - Do not invent values
    - Prefer exact values from the OCR text
    - Preserve address text as completely as possible
    - For proof-of-address documents, prioritize:
      1. document holder / tenant / occupant / company name
      2. full address
      3. issue date / billing date / agreement date
      4. provider / landlord / lessor
      5. account/agreement/reference number

    RAW OCR TEXT:
    {raw_text}
    """

    response = model.generate_content(prompt, generation_config=config)
    validated_data = TargetSchemaClass.model_validate_json(response.text)
    return validated_data.model_dump()