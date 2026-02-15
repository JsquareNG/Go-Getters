
import os
import re
from typing import Dict, Optional
from google.cloud import documentai

def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().upper())

def _get_company_type_from_text(full_text: str) -> Optional[str]:
    if not full_text:
        return None
    text = full_text.replace("\r\n", "\n").replace("\r", "\n")
    m = re.search(r"Company Type\s*:\s*(.+)", text, flags=re.IGNORECASE)
    if not m:
        return None
    # take only the first line
    return _norm(m.group(1).split("\n")[0])

def _normalize_key(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"[^a-z0-9 ]+", "", text)
    return text

def detect_entity_type_from_kv(kv: Dict[str, str]) -> Optional[str]:
    keys = set(kv.keys())  # already normalized in _extract_kv_pairs

    # LLP / LP are very explicit in ACRA PDFs
    if "name of llp" in keys or "status of llp" in keys:
        return "LLP"
    if "name of lp" in keys or "status of lp" in keys or "status of limited partnership" in keys:
        return "LP"

    # Sole prop / partnership typically show "Name of Business"
    if "name of business" in keys:
        # you can't distinguish sole prop vs partnership purely from this key alone reliably
        # (unless you also extract "company type"/"business type" etc)
        return "BUSINESS"  # temporary label, handle later

    # Companies
    if "name of company" in keys or "company name" in keys:
        return "COMPANY"

    return None

def validate_selected_entity_type(selected_norm: str, kv: Dict[str, str]) -> bool:
    keys = set(kv.keys())

    if selected_norm == "LLP":
        return "name of llp" in keys or "status of llp" in keys

    if selected_norm == "LP":
        return (
            "name of lp" in keys
            or "status of lp" in keys
            or "status of limited partnership" in keys
        )

    if selected_norm in ("PRIVATE_LIMITED", "PUBLIC_LIMITED"):
        return "name of company" in keys or "company name" in keys

    if selected_norm in ("SOLE_PROPRIETORSHIP", "PARTNERSHIP"):
        return "name of business" in keys

    return False

def detect_entity_type(document_text: str, kv: Dict[str, str]) -> Optional[str]:
    # 0) Try KV-based detection first (most reliable)
    kv_detected = detect_entity_type_from_kv(kv)
    if kv_detected == "LLP":
        return "LLP"
    if kv_detected == "LP":
        return "LP"

    # 1) If KV says COMPANY or BUSINESS, use Company Type if available
    company_type = None
    for key_candidate in ["company type", "entity type", "business type"]:
        company_type = kv.get(_normalize_key(key_candidate))
        if company_type:
            company_type = _norm(company_type)
            break

    if not company_type:
        company_type = _get_company_type_from_text(document_text)

    if company_type:
        ct = company_type.replace("-", " ")

        if "SOLE" in ct and "PROPRIETOR" in ct:
            return "SOLE_PROPRIETORSHIP"
        if "PARTNERSHIP" in ct and "LIMITED" not in ct and "LIABILITY" not in ct:
            return "PARTNERSHIP"
        if "PRIVATE" in ct:
            return "PRIVATE_LIMITED"
        if "PUBLIC" in ct:
            return "PUBLIC_LIMITED"

    # 2) If KV said BUSINESS but no company type found, you can choose:
    # - either return None (force user to select correctly)
    # - or default BUSINESS to SOLE_PROPRIETORSHIP (not recommended)
    if kv_detected == "BUSINESS":
        return None

    return None

def _extract_text(doc, text_anchor):
    if not text_anchor or not text_anchor.text_segments:
        return ""
    result = []
    for seg in text_anchor.text_segments:
        start = int(seg.start_index or 0)
        end = int(seg.end_index or 0)
        result.append(doc.text[start:end])
    return "".join(result).strip()


def _extract_kv_pairs(doc) -> Dict[str, str]:
    kv = {}
    for page in doc.pages:
        for field in page.form_fields:
            key = _extract_text(doc, field.field_name.text_anchor)
            value = _extract_text(doc, field.field_value.text_anchor)
            if key:
                cleaned_value = (value or "").strip()

                # Remove leading colon(s) and whitespace/newlines
                cleaned_value = re.sub(r"^:\s*", "", cleaned_value)

                # Also remove accidental leading newline after colon
                cleaned_value = cleaned_value.lstrip()

                kv[_normalize_key(key)] = cleaned_value
    return kv


def _fallback_extract_address(full_text: str, label: str) -> Optional[str]:
    if not full_text:
        return None

    text = full_text.replace("\r\n", "\n").replace("\r", "\n")

    pattern = rf"{re.escape(label)}\s*:\s*(.*?)(?=\n[A-Z][A-Za-z ]+\s*:|$)"
    match = re.search(pattern, text, re.DOTALL)

    if not match:
        return None

    address = match.group(1).strip()
    address = re.sub(r"\n+", ", ", address)
    return address


def extract_acra_data(pdf_bytes: bytes, selected_entity_type: str) -> Dict:
    project_id = os.getenv("GCP_PROJECT_ID")
    location = os.getenv("GCP_LOCATION")
    processor_id = os.getenv("DOC_AI_PROCESSOR_ID")

    client = documentai.DocumentProcessorServiceClient()
    name = client.processor_path(project_id, location, processor_id)

    request = documentai.ProcessRequest(
        name=name,
        raw_document=documentai.RawDocument(
            content=pdf_bytes,
            mime_type="application/pdf"
        ),
    )

    result = client.process_document(request=request)
    document = result.document

    kv = _extract_kv_pairs(document)
    selected = (selected_entity_type or "").strip().upper()

    # allow a few friendly inputs just in case
    ALLOWED = {
        "SOLE PROPRIETORSHIP": "SOLE_PROPRIETORSHIP",
        "SOLE PROPRIETOR": "SOLE_PROPRIETORSHIP",
        "PARTNERSHIP": "PARTNERSHIP",
        "LP": "LP",
        "LIMITED PARTNERSHIP": "LP",
        "LLP": "LLP",
        "PRIVATE LIMITED": "PRIVATE_LIMITED",
        "PRIVATE_LIMITED": "PRIVATE_LIMITED",
        "PUBLIC LIMITED": "PUBLIC_LIMITED",
        "PUBLIC_LIMITED": "PUBLIC_LIMITED",
    }

    selected_norm = ALLOWED.get(selected, selected)

    # First validate using KV structure (more reliable than text)
    if not validate_selected_entity_type(selected_norm, kv):
        raise ValueError(
            f"Entity type mismatch or unsupported document format. "
            f"You selected '{selected_norm}', but extracted keys were: "
            f"{list(kv.keys())[:20]}"
        )


    def find(keys):
        for k in keys:
            val = kv.get(_normalize_key(k))
            if val:
                return val
        return None


    LABELS = {
    "SOLE_PROPRIETORSHIP": {
        "name": ["name of business", "business name", "name of entity", "name"],
        "date": ["date of registration", "registration date", "incorporation date"],
        "status": ["status of business", "status"],
        "address": ["principal place of business", "registered office address", "address"],
    },
    "PARTNERSHIP": {
        "name": ["name of business", "name of partnership", "partnership name", "name of entity", "name"],
        "date": ["date of registration", "registration date"],
        "status": ["status of business", "status of partnership", "status"],
        "address": ["principal place of business", "address"],
    },
    "PRIVATE_LIMITED": {
        "name": ["name of company", "company name", "name"],
        "date": ["incorporation date", "date of incorporation"],
        "status": ["status of company", "company status", "status"],
        "address": ["registered office address", "registered address", "address"],
    },
    "PUBLIC_LIMITED": {
        "name": ["name of company", "company name", "name"],
        "date": ["incorporation date", "date of incorporation"],
        "status": ["status of company", "company status", "status"],
        "address": ["registered office address", "registered address", "address"],
    },
    "LLP": {
        "name": ["name of llp", "limited liability partnership name", "name of entity", "name"],
        "date": ["date of registration", "registration date"],
        "status": ["status of llp", "status"],
        "address": ["registered office address", "address"],
    },
    "LP": {
        "name": ["name of lp", "name of limited partnership", "limited partnership name", "name of entity", "name"],
        "date": ["date of registration", "registration date"],
        "status": ["status of lp", "status of limited partnership", "status"],
        "address": ["principal place of business", "address"],
    },
}

    labels = LABELS[selected_norm]  # after validation
    registered_address = find(labels["address"])

    if not registered_address:
        for label in labels["address"]:
            registered_address = _fallback_extract_address(document.text, label)
            if registered_address:
                break

    return {
        "entity_type": selected_norm,
        "entity_name": find(labels["name"]),
        "uen": find(["uen", "unique entity number", "entity number"]),
        "incorporation_or_registration_date": find(labels["date"]),
        "status": find(labels["status"]),
        "address": registered_address,
    }
