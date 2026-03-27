from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Any, Dict, Type
import re 

# -----------------------------
# Shared person / party schemas
# -----------------------------
class BasicPerson(BaseModel):
    full_name: str = Field(default="", description="Full legal name")
    id_number: str = Field(default="", description="NRIC / Passport / ID number")
    nationality: str = Field(default="", description="Nationality")
    residential_address: str = Field(default="", description="Residential address")
    date_of_birth: str = Field(default="", description="Date of birth if available")


class LLPManager(BaseModel):
    full_name: str = Field(default="", description="Full legal name")
    id_number: str = Field(default="", description="NRIC / Passport / ID number")
    nationality: str = Field(default="", description="Nationality")
    residential_address: str = Field(default="", description="Residential address")


    
class Shareholder(BaseModel):
    name: str = Field(default="", description="Name of founder/shareholder")
    entity_type: str = Field(default="", description="INDIVIDUAL or COMPANY")
    id_number: str = Field(default="", description="ID number if individual and clearly shown")
    registration_number: str = Field(default="", description="Company/entity registration number if clearly shown")
    address: str = Field(default="", description="Address of shareholder if clearly shown")
    nationality_or_place_of_origin: str = Field(default="", description="Nationality or place of origin of individual")
    registered_address: str = Field(default="", description="Address of individual or corporate entity")
    share_percentage: float = Field(default=0.0, description="Percentage of shares")
    nominal_value_idr: Optional[float] = Field(default=None, description="Nominal subscription amount in IDR")
    ownership_percentage: Optional[float] = Field(
        default=None,
        description="Ownership percentage if explicitly stated or safely derivable",
    )

class KBLIDetail(BaseModel):
    kbli_code: str = Field(default="", description="5-digit KBLI code")
    kbli_title: str = Field(default="", description="English title/description of the KBLI activity")
    business_location: str = Field(default="", description="Business location for this activity")
    risk_classification: str = Field(default="", description="Risk classification of the activity")
    activity_type: str = Field(default="", description="Activity type if shown")
    business_permit_legality: str = Field(default="", description="Permit legality / permit status if shown")

    @field_validator("kbli_code")
    @classmethod
    def validate_kbli_code(cls, v: str) -> str:
        if not v:
            return ""
        cleaned = re.sub(r"\D", "", v)
        if cleaned and not re.match(r"^\d{5}$", cleaned):
            raise ValueError(f"Invalid KBLI code: '{v}'. Must be 5 digits.")
        return cleaned


class NIBExtractionData(BaseModel):
    company_name: str = Field(description="Name of the business")
    nib_number: str = Field(description="13-digit Nomor Induk Berusaha")
    company_status: str = Field(description="Status (e.g., PMA or PMDN)")
    address: str = Field(description="Registered address")
    kbli_codes: List[str] = Field(default_factory=list, description="List of 5-digit KBLI codes")

    phone_number: str = Field(default="", description="Business phone number if present")
    email: str = Field(default="", description="Business email address if present")
    issued_date: str = Field(default="", description="Issued date in DD-MM-YYYY if safely inferable")
    printed_date: str = Field(default="", description="Printed date in DD-MM-YYYY if safely inferable")
    issuer: str = Field(default="", description="Issuing authority shown on the NIB document")

    kbli_details: List[KBLIDetail] = Field(
        default_factory=list,
        description="Detailed KBLI activity rows shown in the NIB document"
    )

    @field_validator("nib_number")
    @classmethod
    def validate_nib(cls, v: str) -> str:
        cleaned = re.sub(r"\D", "", v)
        if not re.match(r"^\d{13}$", cleaned):
            raise ValueError("Invalid NIB format. Must be exactly 13 digits.")
        return cleaned

    @field_validator("kbli_codes")
    @classmethod
    def validate_kbli(cls, v: List[str]) -> List[str]:
        cleaned_codes = []
        for code in v:
            digits = re.sub(r"\D", "", code or "")
            if not digits:
                continue
            if not re.match(r"^\d{5}$", digits):
                raise ValueError(f"Invalid KBLI code: '{code}'. Must be 5 digits.")
            cleaned_codes.append(digits)
        return cleaned_codes

    additional_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="""
        Extract ALL other information, fields, and tables from the document that are not
        explicitly requested above. Group them logically using clear snake_case keys.
        Only put truly non-essential extra fields here.
        """,
    )

# -----------------------------
# ACRA Basic Info Schema
# -----------------------------
class ACRABasicInfoData(BaseModel):
    document_type: str = Field(default="ACRA")
    entity_type: str = Field(
        default="",
        description="""
        Possible values: SOLE_PROPRIETORSHIP, GENERAL_PARTNERSHIP, LIMITED_PARTNERSHIP,
        LLP, PRIVATE_LIMITED_COMPANY, or other close equivalent if detected.
        """
    )

    business_name: str = Field(default="")
    uen: str = Field(default="")
    date_of_registration: str = Field(default="")
    business_status: str = Field(default="")
    registered_address: str = Field(default="")

    # Entity-specific sections
    owner: Optional[BasicPerson] = None
    partners: List[BasicPerson] = Field(default_factory=list)
    general_partners: List[BasicPerson] = Field(default_factory=list)
    limited_partners: List[BasicPerson] = Field(default_factory=list)
    managers: List[LLPManager] = Field(default_factory=list)
    directors: List[BasicPerson] = Field(default_factory=list)
    shareholders: List[Shareholder] = Field(default_factory=list)

    @field_validator("uen")
    @classmethod
    def validate_uen(cls, v: str) -> str:
        cleaned = re.sub(r"[^A-Z0-9]", "", v.upper())
        if not re.match(r"^[A-Z0-9]{9,10}$", cleaned):
            raise ValueError(f"Invalid UEN format from OCR: {cleaned}")
        return cleaned

    additional_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="""
        Extract ALL other information, fields, and tables from the document that are not
        explicitly requested above. Group them logically (e.g., 'officers', 'activities',
        'financials'). Use clear, snake_case keys.
        """,
    )

BASIC_INFO_SCHEMA_REGISTRY = {
    "NIB": NIBExtractionData,
    "ACRA": ACRABasicInfoData,
}