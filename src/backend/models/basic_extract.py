from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Type

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
    shareholder_type: Literal["INDIVIDUAL", "CORPORATE", ""] = Field(
        default="",
        description="Type of shareholder"
    )

    # Individual shareholder
    name: str = Field(default="", description="Individual name or corporate entity name")
    id_number: str = Field(default="", description="NRIC / Passport if individual")
    registration_number: str = Field(default="", description="Registration number / UEN if corporate")
    share_percentage: str = Field(default="", description="Percentage of shares")


# -----------------------------
# NIB Basic Info Schema
# -----------------------------
class NIBBasicInfoData(BaseModel):
    document_type: str = Field(default="NIB")
    business_name: str = Field(default="")
    business_registration_number: str = Field(default="", description="NIB")
    npwp: str = Field(default="")
    date_of_registration: str = Field(default="")
    business_status: str = Field(default="")
    registered_address: str = Field(default="")
    email: str = Field(default="")
    phone: str = Field(default="")
    business_activities: List[str] = Field(default_factory=list)


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

BASIC_INFO_SCHEMA_REGISTRY = {
    "NIB": NIBBasicInfoData,
    "ACRA": ACRABasicInfoData,
}