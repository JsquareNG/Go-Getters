import re


def normalize_proof_of_address(doc_type: str, data: dict) -> dict:
    doc_type = doc_type.upper()

    if doc_type == "UTILITY_BILL":
        return {
            "document_type": doc_type,
            "name": data.get("occupant_name", ""),
            "address": data.get("service_address", ""),
            "document_date": data.get("issue_date") or data.get("document_date", ""),
            "issuer": data.get("provider_or_landlord_name", ""),
            "reference_number": data.get("account_number") or data.get("reference_number", ""),
        }

    if doc_type == "TENANCY_AGREEMENT":
        return {
            "document_type": doc_type,
            "name": data.get("tenant_name") or data.get("occupant_name", ""),
            "address": data.get("leased_premises_address") or data.get("service_address", ""),
            "document_date": data.get("document_date") or data.get("issue_date", ""),
            "issuer": data.get("landlord_name") or data.get("provider_or_landlord_name", ""),
            "reference_number": data.get("agreement_number") or data.get("reference_number", ""),
        }

    if doc_type == "OFFICE_LEASE":
        return {
            "document_type": doc_type,
            "name": data.get("tenant_name") or data.get("occupant_name", ""),
            "address": data.get("leased_office_address") or data.get("service_address", ""),
            "document_date": data.get("document_date") or data.get("issue_date", ""),
            "issuer": data.get("lessor_name") or data.get("provider_or_landlord_name", ""),
            "reference_number": data.get("agreement_number") or data.get("reference_number", ""),
        }

    return data


def normalize_address(addr: str) -> str:
    """Normalize address for comparison."""
    if not addr:
        return ""

    addr = addr.upper().strip()
    addr = re.sub(r"[^A-Z0-9\s]", " ", addr)
    addr = re.sub(r"\s+", " ", addr)

    replacements = {
        "ROAD": "RD",
        "STREET": "ST",
        "AVENUE": "AVE",
        "BUILDING": "BLDG",
        "UNIT": "#",
    }

    words = addr.split()
    words = [replacements.get(w, w) for w in words]

    return " ".join(words)


def addresses_match(addr1: str, addr2: str) -> bool:
    """Simple address equality check after normalization."""
    return normalize_address(addr1) == normalize_address(addr2)