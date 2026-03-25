import json
import os
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig
from backend.models.extract import DOCUMENT_SCHEMA_REGISTRY

# Initialize Vertex AI
project_id = os.getenv("GCP_PROJECT_ID")
vertex_location = "asia-southeast1"
vertexai.init(project=project_id, location=vertex_location)


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
    - Put long narrative clauses, legal boilerplate, and less critical provisions into additional_data
    - For lists of people, return only names where possible
    - For numeric identifiers, preserve the exact number as shown, but remove obvious OCR spacing artifacts when needed
 
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
    - If the document contains a lot of constitutional boilerplate, do not overpopulate top-level fields with generic governance clauses; keep that in additional_data

    If doc_type is UBO_DECLARATION, prioritize:
    1. company_name
    2. registration_number
    3. declaration_date / signature_date
    4. declarant_name and declarant_role
    5. beneficial_owners
    6. declares_no_ubo
    7. ubo_threshold_percentage
    8. ownership / control basis
    9. PEP / sanctions / source of wealth / source of funds declarations
    10. other certifications in additional_data

    UBO_DECLARATION extraction guidance:
    - A beneficial owner / ultimate beneficial owner is usually a natural person who ultimately owns or controls the entity
    - Extract one object per declared UBO / controlling person
    - If the form explicitly states no natural person meets the threshold, set declares_no_ubo = true
    - If the form states a threshold such as 25%, extract it into ubo_threshold_percentage
    - ownership_type should preferably be:
      - DIRECT -> direct ownership stated
      - INDIRECT -> indirect ownership through another entity stated
      - CONTROL -> control through voting rights / other means stated
      - OTHER -> another basis is stated but not clearly one of the above
    - control_description should summarize the declared basis of ownership/control
    - politically_exposed_person should only be true/false if explicitly shown from checkbox/tick/statement; otherwise null
    - sanctions_declared should only be true/false if explicitly shown from checkbox/tick/statement; otherwise null
    - source_of_wealth and source_of_funds should only be extracted if stated in the form
    - If there are multiple UBOs, return all of them in beneficial_owners
    - If share percentages are shown, extract numeric percentages without the percent sign
    - If the document includes ownership chain notes, keep extra details in additional_data
    - If the form includes checkbox declarations, preserve the meaning accurately in top-level fields or additional_data
    - Do not invent a UBO where the form does not explicitly identify one

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