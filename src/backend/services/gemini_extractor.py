import json
from pydantic import BaseModel, Field
import os
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig
from backend.models.extract import DOCUMENT_SCHEMA_REGISTRY

# Initialize Vertex AI
project_id = os.getenv("GCP_PROJECT_ID")
vertex_location = "asia-southeast1"
vertexai.init(project=project_id, location=vertex_location)

class RequestedDocumentMatchAssessment(BaseModel):
    matches_requested_document: bool = Field(
        ...,
        description="Whether the uploaded file reasonably matches the requested document name"
    )
    best_guess_document_type: str = Field(default="UNKNOWN")
    reason: str = Field(default="")
    confidence: str = Field(default="MEDIUM")


def classify_document(raw_text: str) -> str:
    supported_types = list(DOCUMENT_SCHEMA_REGISTRY.keys())
    model = GenerativeModel("gemini-2.5-flash")

    prompt = f"""
    You are a document classification engine for a bank.
    Look at the following OCR text and identify the document type.

    Supported types: {supported_types}

    You MUST reply STRICTLY with EXACTLY ONE label from the supported types.
    If it is completely unrecognizable, reply STRICTLY with: UNKNOWN

    Core rules:
    - If the text contains "Nomor Induk Berusaha", "NIB", or "Badan Koordinasi Penanaman Modal", reply STRICTLY with: NIB
    - If the text looks like a bank transaction history or bank statement, reply STRICTLY with: BANK_STATEMENT
    - - If the text contains "ACCOUNTING AND CORPORATE REGULATORY AUTHORITY" or "ACRA", reply STRICTLY with: ACRA_BUSINESS_PROFILE
    
    Proof of Address rules:
    - If the text looks like a household/business utility bill (electricity, water, gas, telecom, broadband, internet), reply STRICTLY with: UTILITY_BILL
    - If the text looks like a tenancy agreement between landlord and tenant, reply STRICTLY with: TENANCY_AGREEMENT
    - If the text looks like a commercial office/shop/business premises lease, reply STRICTLY with: OFFICE_LEASE

    New business/legal document rules:
    - If the document is a limited partnership agreement and refers to general partner / limited partner, reply STRICTLY with: LP_AGREEMENT
    - If the document is an limited liability partnership (LLP) agreement with LLP members' / partners' / designated partners' resolution, reply STRICTLY with: LLP_RESOLUTION
    - If the document is a company board resolution for a private limited company, directors' resolution, or board approval, reply STRICTLY with: BOARD_RESOLUTION
    - If the document is an Indonesian tax registration certificate showing NPWP / Nomor Pokok Wajib Pajak, reply STRICTLY with: NPWP_CERTIFICATE
    - If the document is an Indonesian deed of incorporation / deed of establishment / notarial incorporation deed for a PT, reply STRICTLY with: AKTA_PENDIRIAN
    - If the document is a UBO declaration, beneficial ownership declaration, ultimate beneficial owner declaration, beneficial owner self-certification, or declaration of beneficial owners, reply STRICTLY with: UBO_DECLARATION

    Classification hints:
    - LP_AGREEMENT often contains: limited partnership agreement, LP, general partner, limited partner, LP agreement
    - LLP_RESOLUTION often contains: LLP, limited liability partnership agreement, limited liability resolution
    - BOARD_RESOLUTION often contains: board resolution, directors, resolved that, board of directors, company secretary
    - NPWP_CERTIFICATE often contains: NPWP, Nomor Pokok Wajib Pajak, tax office, Direktorat Jenderal Pajak
    - UBO_DECLARATION often contains: Ultimate beneficial owner, UBO declaration, UBO, beneficial owner 

    Strong AKTA_PENDIRIAN indicators:
    - "AKTA PENDIRIAN PERSEROAN TERBATAS"
    - "AKTA PENDIRIAN"
    - "PERSEROAN TERBATAS"
    - "Notaris"
    - "Nomor"
    - "Tanggal"
    - "Pasal 1", "Pasal 2", "Pasal 3"
    - "Maksud dan tujuan"
    - "Modal dasar"
    - "Direksi"
    - "Dewan Komisaris"
    - "Rapat Umum Pemegang Saham"
    - "berkedudukan di"
    - "KBLI"

    Disambiguation rules:
    - If the document mainly proves tax registration number -> NPWP_CERTIFICATE
    - If the document mainly proves business licensing / NIB -> NIB
    - If the document mainly establishes a new PT and contains articles of association / corporate constitution -> AKTA_PENDIRIAN
    - If the document mainly records a formal company decision by directors -> BOARD_RESOLUTION
    - If the document mainly records a formal LLP decision -> LLP_RESOLUTION
    - If the document mainly declares the natural persons who ultimately own/control an entity -> UBO_DECLARATION

    OCR TEXT:
    {raw_text[:5000]}
    """

    response = model.generate_content(prompt)
    result = response.text.strip().upper()

    print("\n" + "=" * 40)
    print(f"🤖 AI CLASSIFICATION RESULT: {result}")
    print(f"📄 FIRST 500 CHARS OF OCR TEXT:\n{raw_text[:500]}")
    print("=" * 40 + "\n")

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

    Context:
    - This bank platform is used for SME onboarding for opening a business account.
    - Your task is to extract business registration, ownership, governance, and legal document information relevant for onboarding and KYC/KYB checks.

    Extract the data and format it STRICTLY according to this JSON schema:
    {schema_instructions}

    Global extraction rules:
    - Return valid JSON only
    - If a field is missing, return empty string, null, or empty list as appropriate
    - Do not invent values
    - Prefer exact values from the OCR text
    - Preserve names and addresses as completely as possible
    - Remove obvious OCR spacing artifacts only when it improves fidelity
    - For lists of people, return only names where possible
    - For numeric identifiers, preserve the exact number as shown, but remove obvious OCR spacing artifacts when needed
    - If the source document is not in English, translate descriptive field values into natural English.
    - Do NOT translate proper nouns or identifiers, including:
      company names, person names, registration numbers, tax numbers, codes, UEN, NIB, NPWP, KBLI codes, and addresses.
    - Keep names and addresses in their original form as shown in the document.
    - For non-English documents, translate narrative text, labels, statuses, activity descriptions, notes, and legal boilerplate into English.
    - For dates written with non-English month names, normalize them into DD-MM-YYYY if safely inferable; otherwise translate month names into English.
    - Return JSON keys exactly as defined by the schema.
 
    Additional extraction rules for ACRA:
    - For shareholders, share_percentage is the number of shares of shareholder divide by total shares of all shareholders
    For legal/business formation documents, generally prioritize:
    1. legal entity name
    2. registration / tax / deed / incorporation / reference number
    3. issue / agreement / incorporation / deed / resolution date
    4. registered address
    5. directors / partners / founders / shareholders / signatories
    6. resolution subject / business purpose / governance details

    If doc_type is AKTA_PENDIRIAN, prioritize:
    1. company_name
    2. legal_entity_type
    3. deed_number
    4. deed_date
    5. notary_name
    6. domicile_city / registered_address
    7. business_purpose
    8. business_activities and KBLI codes
    9. authorized / issued / paid-up capital
    10. founders / shareholders and their share subscriptions
    11. directors
    12. commissioners
    13. ministerial / AHU reference numbers and supporting entity names

    AKTA_PENDIRIAN extraction guidance:
    - "Nomor" near the deed heading is usually the deed number
    - "Tanggal" near the deed heading or opening paragraph is the deed date
    - "berkedudukan di" usually indicates domicile city
    - "Maksud dan tujuan" and activity lists contain the business purpose and KBLI
    - "Modal dasar", "ditempatkan", and "disetor" contain capital structure
    - Founder/shareholder subscriptions are often listed near the closing pages with share counts and IDR amounts
    - Initial appointments of Direksi and Dewan Komisaris may appear near the end
    - If a person appears only as a representative of a corporate founder, include them in representative_parties, not as a shareholder unless the deed explicitly says they personally subscribe shares
    - For shareholders:
      - Extract one object per founder/shareholder
      - Determine entity_type as INDIVIDUAL or COMPANY
      - Extract share_count if shown
      - Extract nominal_value_idr if shown
      - Extract ownership_percentage only if explicitly stated or safely derivable from the deed


    UBO_DECLARATION extraction guidance:

      CRITICAL: Ownership structure extraction (VERY IMPORTANT)
      - The document may contain an ownership chart / diagram / appendix (often on later pages).
      - You MUST analyze ALL pages, including diagrams and appendices, not just tables.
      - Do NOT rely only on the "Beneficial Owner Details" table.

      Step-by-step reasoning REQUIRED (do NOT skip):
      1. Identify the declared company (root entity).
      2. Identify all intermediate corporate shareholders (if any).
      3. Identify ultimate natural persons at the top.
      4. Trace the LONGEST ownership path from company → ... → natural person.

      Definition:
      - layers_of_ownership = MAX number of vertical levels from the company to ultimate natural person.

      Counting rules:
      - Company → Natural Person = 1 layer
      - Company → Corporate → Natural Person = 2 layers
      - Company → Corporate → Corporate → Natural Person = 3 layers

      IMPORTANT:
      - If an ownership chart exists, ALWAYS use it as the primary source.
      - If the ownership chart contradicts the table, TRUST the chart.
      - If multiple paths exist, return the MAXIMUM depth.

      Anti-shortcut rule:
      - If only beneficial owners are listed (no intermediates), you may return 1.
      - HOWEVER, if any corporate shareholder appears ANYWHERE, you MUST increase layers.

      Output rule:
      - If ownership chart is present → layers_of_ownership MUST NOT be null.
      - If unclear → return null (do NOT guess).

      Sanity check before output:
      - Ask yourself: "Did I check for corporate layers in diagrams?"
      - If NO → re-evaluate.

      If doc_type is UNKNOWN, prioritize:
      1. best_guess_document_type
      2. display_label

    UNKNOWN extraction guidance:
    - This document is not one of the supported onboarding document types
    - Determine the best high-level guess for what it is, such as:
      RESUME, CV, INVOICE, TAX_INVOICE, RECEIPT, QUOTATION, PURCHASE_ORDER,
      EMPLOYMENT_LETTER, PASSPORT, ID_CARD, DRIVING_LICENSE, LETTER, CONTRACT, OTHERS
    - display_label should usually be "Unsupported Document"
    - Do not force the document into a supported schema
    - Do not invent banking/KYC fields that are not present

    RAW OCR TEXT:
    {raw_text}
    """

    response = model.generate_content(prompt, generation_config=config)
    validated_data = TargetSchemaClass.model_validate_json(response.text)
    return validated_data.model_dump()


def assess_requested_document_match(
    raw_text: str,
    requested_document_name: str,
) -> dict:
    model = GenerativeModel("gemini-2.5-flash")
    config = GenerationConfig(response_mime_type="application/json")

    prompt = f"""
    You are an expert KYC/KYB compliance AI for a bank.

    Context:
    - A staff reviewer requested an additional document from an applicant.
    - The requested document name is: {requested_document_name}
    - Your task is to determine whether the uploaded file reasonably matches that requested document name.

    Instructions:
    - Be practical and conservative.
    - The requested document name may be free text and not part of a fixed schema.
    - Compare the OCR text against the requested document name semantically.
    - If the uploaded file does not match, provide the best guess of what kind of document it actually is.
    - If the uploaded file does match, best_guess_document_type should describe the document naturally.
    - Keep the boolean consistent with your explanation.

    Consistency rules:
    - If your reason says the document matches, then matches_requested_document MUST be true.
    - If best_guess_document_type is effectively the same as the requested document name, matches_requested_document should usually be true.
    - Only return false if the uploaded file is clearly a different kind of document.

    Return EXACTLY this JSON structure:
    {{
      "matches_requested_document": true,
      "best_guess_document_type": "string",
      "reason": "string",
      "confidence": "LOW"
    }}

    Valid confidence values:
    - LOW
    - MEDIUM
    - HIGH

    Requested document name:
    {requested_document_name}

    OCR TEXT:
    {raw_text[:8000]}
    """

    response = model.generate_content(prompt, generation_config=config)
    validated_data = RequestedDocumentMatchAssessment.model_validate_json(response.text)
    return validated_data.model_dump()


def parse_generic_additional_document(
    raw_text: str,
    requested_document_name: str,
) -> dict:
    TargetSchemaClass = DOCUMENT_SCHEMA_REGISTRY["GENERIC_ADDITIONAL_DOCUMENT"]
    schema_instructions = json.dumps(TargetSchemaClass.model_json_schema(), indent=2)

    model = GenerativeModel("gemini-2.5-flash")
    config = GenerationConfig(response_mime_type="application/json")

    prompt = f"""
    You are an expert KYC/KYB compliance AI for a bank.

    Context:
    - A staff reviewer requested an additional supporting document from an applicant.
    - The requested document name is: {requested_document_name}
    - The uploaded file may be any kind of business, legal, financial, tax, licensing, contractual, or supporting document.
    - Your job is to understand what the uploaded document is and extract the most relevant information in a flexible, generic structure.

    Extract the data and format it STRICTLY according to this JSON schema:
    {schema_instructions}

    Global extraction rules:
    - Return valid JSON only
    - Do not invent values
    - Be conservative
    - If a field is missing, return empty string, null, empty list, or empty object as appropriate
    - Preserve names, identifiers, dates, and addresses as faithfully as possible
    - Remove obvious OCR spacing artifacts only when it improves fidelity
    - If the source document is not in English, translate descriptive values into natural English
    - Do NOT translate proper nouns, person names, company names, registration numbers, tax numbers, account numbers, codes, or addresses

    Extraction guidance:
    - requested_document_name: echo the requested document name
    - matched_requested_document: whether the uploaded file appears to match the requested document name
    - detected_document_type: best natural-language guess of the uploaded document type
    - document_purpose_summary: one short summary of what this document is for

    - key_entities: important people, company names, authorities, counterparties, banks, landlords, tenants, issuers
    - key_identifiers: registration number, UEN, NIB, NPWP, account number, invoice number, reference number, policy number, etc.
    - important_dates: incorporation date, issue date, expiry date, billing period, agreement date, due date, statement period
    - addresses: registered address, service address, premises address, mailing address, business address
    - financial_information: amounts, balances, capital, invoice totals, rent, deposits, obligations, payment amounts
    - ownership_and_governance: directors, shareholders, partners, signatories, beneficial owners, commissioners
    - obligations_and_terms: validity period, lease term, contract term, payment terms, important obligations, conditions

    - extracted_mapped_fields: optional normalized fields only when clearly inferable, such as:
      company_name, registration_number, uen, nib_number, npwp_number, registered_address,
      incorporation_date, issue_date, expiry_date, directors, shareholders, bank_name, account_number

    - additional_relevant_info: any other useful content not covered above
    - missing_or_unclear_items: important expected items that seem missing or unclear

    Requested document name:
    {requested_document_name}

    OCR TEXT:
    {raw_text[:12000]}
    """

    response = model.generate_content(prompt, generation_config=config)
    validated_data = TargetSchemaClass.model_validate_json(response.text)
    return validated_data.model_dump()