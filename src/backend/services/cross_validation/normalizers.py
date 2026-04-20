from __future__ import annotations

import re
from typing import Any, Dict, List
from datetime import datetime


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip().lower()
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def normalize_identifier(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"[^A-Z0-9]", "", str(value).upper())


def normalize_business_name(value: Any) -> str:
    text = normalize_text(value)

    replacements = {
        "pte ltd": "private limited",
        "pte. ltd.": "private limited",
        "pt": "perseroan terbatas",
        "llp": "limited liability partnership",
        "lp": "limited partnership",
        "&": "and",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_person_name(value: Any) -> str:
    text = normalize_text(value)
    text = re.sub(r"\b(mr|mrs|ms|dr)\b", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_address(value: Any) -> str:
    text = normalize_text(value)

    replacements = {
        "road": "rd",
        "street": "st",
        "avenue": "ave",
        "building": "bldg",
        "jalan": "jl",
    }

    for old, new in replacements.items():
        text = re.sub(rf"\b{re.escape(old)}\b", new, text)

    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_entity_type(value: Any) -> str:
    if value is None:
        return ""

    text = str(value).strip().lower()
    text = text.replace("_", " ").replace("-", " ")
    text = re.sub(r"\s+", " ", text).strip()

    aliases = {
        "perseroan terbatas": "private_limited",
        "commanditaire vennotschap": "limited_partnership",
        "commanditaire vennootschap": "limited_partnership",
        "private limited": "private_limited",
        "usaha dagang": "sole_proprietorship",
        "sole proprietorship": "sole_proprietorship",
        "limited partnership": "limited_partnership",
        "llp": "limited_liability_partnership",
        "limited liability partnership": "limited_liability_partnership",
        "sole proprietor": "sole_proprietorship",
        "sole proprietor business": "sole_proprietorship",
        "limited exempt private company": "private_limited",
        "exempt private company limited by shares": "private_limited",
        "private company limited by shares": "private_limited",
        "private limited company": "private_limited",
    }

    return aliases.get(text, text)

def normalize_date(value: Any) -> str:
    if value in (None, ""):
        return ""

    raw = str(value).strip()
    if not raw:
        return ""

    raw = re.sub(r"\s+", " ", raw).strip()
    raw = raw.replace(".", " ").replace(",", " ")
    raw = " ".join(part.capitalize() if part.isalpha() else part for part in raw.split())

    formats = [
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%d %b %Y",
        "%d %B %Y",
        "%d %m %Y",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue

    cleaned = raw.replace("-", "/").replace(" ", "/")
    for fmt in ("%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(cleaned, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue

    return ""

def normalize_form_individuals(individuals_raw: Any) -> List[Dict[str, Any]]:
    if not individuals_raw:
        return []

    if isinstance(individuals_raw, dict):
        individuals = [individuals_raw]
    elif isinstance(individuals_raw, list):
        individuals = individuals_raw
    else:
        return []

    normalized = []

    for person in individuals:
        if not isinstance(person, dict):
            continue

        normalized.append({
            "role": normalize_text(person.get("role")),
            "full_name": person.get("fullName") or person.get("full_name") or "",
            "id_number": person.get("idNumber") or person.get("id_number") or "",
            "nationality": person.get("nationality") or "",
            "date_of_birth": person.get("dateOfBirth") or person.get("date_of_birth") or "",
        })

    return normalized


def normalize_acra_people(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    people: List[Dict[str, Any]] = []

    owner = data.get("owner")
    if isinstance(owner, dict) and owner:
        people.append({
            "role": "owner",
            "full_name": owner.get("fullName", ""),
            "id_number": owner.get("idNumber", ""),
            "nationality": owner.get("nationality", ""),
            "date_of_birth": owner.get("dateOfBirth", ""),
        })

    for director in data.get("directors", []) or []:
        if isinstance(director, dict):
            people.append({
                "role": "director",
                "full_name": director.get("fullName", ""),
                "id_number": director.get("idNumber", ""),
                "nationality": director.get("nationality", ""),
                "date_of_birth": director.get("dateOfBirth", ""),
            })

    for partner in data.get("partners", []) or []:
        if isinstance(partner, dict):
            people.append({
                "role": "partner",
                "full_name": partner.get("fullName", ""),
                "id_number": partner.get("idNumber", ""),
                "nationality": partner.get("nationality", ""),
                "date_of_birth": partner.get("dateOfBirth", ""),
            })

    for manager in data.get("managers", []) or []:
        if isinstance(manager, dict):
            people.append({
                "role": "manager",
                "full_name": manager.get("fullName", ""),
                "id_number": manager.get("idNumber", ""),
                "nationality": manager.get("nationality", ""),
                "date_of_birth": manager.get("dateOfBirth", ""),
            })

    return people


def normalize_form_data(form_data: Dict[str, Any]) -> Dict[str, Any]:
    def first_non_empty(*values: Any) -> Any:
        for value in values:
            if value not in (None, "", [], {}):
                return value
        return ""

    return {
        "business_name": first_non_empty(
            form_data.get("businessName"),
            form_data.get("business_name"),
            form_data.get("companyName"),
            form_data.get("entityName"),
            form_data.get("registeredBusinessName"),
        ),
        "registration_number": first_non_empty(
            form_data.get("registrationNumber"),
            form_data.get("registration_number"),
            form_data.get("uen"),
            form_data.get("nibNumber"),
            form_data.get("businessRegistrationNumber"),
        ),
        "registered_address": first_non_empty(
            form_data.get("registeredAddress"),
            form_data.get("registered_address"),
            form_data.get("businessAddress"),
            form_data.get("companyAddress"),
        ),
        "registration_date": first_non_empty(
            form_data.get("registrationDate"),
            form_data.get("registration_date"),
            form_data.get("incorporationDate"),
            form_data.get("businessRegistrationDate"),
        ),
        "entity_type": first_non_empty(
            form_data.get("entityType"),
            form_data.get("businessType"),
            form_data.get("business_type"),
            form_data.get("legalEntityType"),
        ),
        "tax_number": first_non_empty(
            form_data.get("npwp"),
            form_data.get("taxNumber"),
            form_data.get("tax_number"),
            form_data.get("npwpNumber"),
        ),
        "bank_account_holder_name": first_non_empty(
            form_data.get("bankAccountHolderName"),
            form_data.get("accountHolderName"),
            form_data.get("businessName"),
            form_data.get("business_name"),
        ),
        "bank_account_number": first_non_empty(
            form_data.get("bankAccountNumber"),
            form_data.get("bank_account_number"),
            form_data.get("accountNumber"),
        ),
        "individuals": normalize_form_individuals(form_data.get("individuals")),

        "business_country": first_non_empty(
            form_data.get("country"),
            form_data.get("businessCountry"),
            form_data.get("business_country"),
        ),
        "business_type_raw": first_non_empty(
            form_data.get("businessType"),
            form_data.get("business_type"),
        ),
        "annual_revenue": first_non_empty(
            form_data.get("annualRevenue"),
            form_data.get("annual_revenue"),
        ),
        "source_of_funds": first_non_empty(
            form_data.get("sourceOfFunds"),
            form_data.get("source_of_funds"),
        ),
        "business_industry": first_non_empty(
            form_data.get("businessIndustry"),
            form_data.get("business_industry"),
            form_data.get("industry"),
        ),
        "swift_bic": first_non_empty(
            form_data.get("swiftBic"),
            form_data.get("swift_bic"),
        ),
        "email": first_non_empty(form_data.get("email")),
        "phone": first_non_empty(form_data.get("phone")),
    }


def normalize_document_data(doc_type: str, extracted: Dict[str, Any]) -> Dict[str, Any]:
    data = extracted.get("data", extracted) if isinstance(extracted, dict) else {}

    if doc_type == "ACRA":
        return {
            "business_name": data.get("businessName", ""),
            "registration_number": data.get("uen", ""),
            "registered_address": data.get("registeredAddress", ""),
            "registration_date": data.get("registrationDate", "") or data.get("business_start_date", ""),
            "entity_type": data.get("entityType", ""),
            "individuals": normalize_acra_people(data),
            "status_of_business": ((data.get("additional_data") or {}).get("status_of_business", "")),
            "primary_business_activity": data.get("primary_business_activity", ""),
        }

    if doc_type == "NIB":
        return {
            "business_name": data.get("businessName", ""),
            "registration_number": data.get("registrationNumber", "") or data.get("nib_number", ""),
            "registered_address": data.get("registeredAddress", ""),
            "registration_date": data.get("registrationDate", ""),
        }

    if doc_type == "NPWP_CERTIFICATE":
        return {
            "business_name": data.get("businessName", "") or data.get("taxpayer_name", ""),
            "tax_number": data.get("npwp", "") or data.get("npwp_number", ""),
            "registered_address": data.get("registeredAddress", ""),
            "registration_date": data.get("registrationDate", "") or data.get("issue_date", ""),
        }

    if doc_type == "BANK_STATEMENT":
        return {
            "bank_account_holder_name": data.get("accountHolderName", "") or data.get("account_holder_name", ""),
            "bank_account_number": data.get("accountNumber", "") or data.get("account_number", ""),
            "registered_address": data.get("accountHolderAddress", "") or data.get("account_holder_address", ""),
            "account_currency": data.get("accountCurrency", "") or data.get("account_currency", ""),
            "statement_period": data.get("statementPeriod", "") or data.get("statement_period", ""),
            "bank_name": data.get("bankName", "") or data.get("bank_name", ""),
        }

    if doc_type == "BOARD_RESOLUTION":
        return {
            "business_name": data.get("businessName", ""),
            "resolution_date": data.get("resolutionDate", ""),
        }

    if doc_type == "LLP_RESOLUTION":
        return {
            "business_name": data.get("businessName", ""),
            "registered_address": data.get("registeredAddress", ""),
        }

    if doc_type == "OFFICE_LEASE":
        tenant = data.get("tenant") or {}
        return {
            "business_name": tenant.get("name", ""),
            "registered_address": data.get("registeredAddress", ""),
        }

    if doc_type == "TENANCY_AGREEMENT":
        tenant = data.get("tenant") or {}
        return {
            "business_name": tenant.get("name", ""),
            "registered_address": data.get("leasedPremisesAddress", ""),
        }

    if doc_type == "AKTA_PENDIRIAN":
        return {
            "business_name": data.get("businessName", ""),
            "registration_number": data.get("registrationNumber", ""),
            "registered_address": data.get("registeredAddress", ""),
            "registration_date": data.get("registrationDate", ""),
        }

    if doc_type == "UBO_DECLARATION":
        return {
            "business_name": data.get("businessName", ""),
            "registration_number": data.get("registrationNumber", ""),
        }

    return {}