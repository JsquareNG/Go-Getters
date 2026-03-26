from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Type, Any, Optional
import re


# 1. ACRA Schema
class ACRAExtractionData(BaseModel):
    company_name: str = Field(description="Registered name of the business")
    uen: str = Field(description="Unique Entity Number")
    entity_type: str = Field(description="E.g., SOLE-PROPRIETOR, PRIVATE LIMITED")
    business_start_date: str = Field(description="Date of registration")
    address: str = Field(description="Registered office address")
    primary_business_activity: str = Field(description="Primary activity")

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


# 2. Indonesian NIB Schema
class NIBExtractionData(BaseModel):
    company_name: str = Field(description="Name of the business")
    nib_number: str = Field(description="13-digit Nomor Induk Berusaha")
    company_status: str = Field(description="Status (e.g., PMA or PMDN)")
    address: str = Field(description="Registered address")
    kbli_codes: List[str] = Field(description="List of 5-digit KBLI codes")

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
        explicitly requested above. Group them logically (e.g., 'officers', 'activities',
        'financials'). Use clear, snake_case keys.
        """,
    )


class BankStatementData(BaseModel):
    bank_name: str = Field(default="", description="Name of the bank")
    account_name: str = Field(default="", description="Name of the account holder")
    account_number: str = Field(default="", description="The bank account number")
    account_holder_address: str = Field(default="", description="Address of the account holder")
    account_currency: str = Field(default="", description="Currency of the account")
    statement_period: str = Field(default="", description="Period of the statement")

    opening_balance: Optional[float] = Field(default=None, description="Balance at start of statement")
    closing_balance: Optional[float] = Field(default=None, description="Balance at end of statement")

    total_inflow: Optional[float] = Field(default=None, description="Total incoming funds during statement period")
    total_outflow: Optional[float] = Field(default=None, description="Total outgoing funds during statement period")
    net_cashflow: Optional[float] = Field(default=None, description="Net cashflow (inflow - outflow)")

    average_balance: Optional[float] = Field(default=None, description="Average balance during statement period")
    minimum_balance: Optional[float] = Field(default=None, description="Lowest balance recorded")
    maximum_balance: Optional[float] = Field(default=None, description="Highest balance recorded")

    total_transactions: Optional[int] = Field(default=None, description="Total number of transactions")
    total_credit_transactions: Optional[int] = Field(default=None, description="Number of incoming transactions")
    total_debit_transactions: Optional[int] = Field(default=None, description="Number of outgoing transactions")

    largest_incoming_transaction: Optional[float] = Field(default=None, description="Largest incoming transaction")
    largest_outgoing_transaction: Optional[float] = Field(default=None, description="Largest outgoing transaction")

    unique_counterparties: Optional[int] = Field(default=None, description="Number of unique transaction counterparties")

    additional_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Any other useful extracted data not covered by the main schema",
    )


class ProofOfAddressBase(BaseModel):
    document_date: str = Field(default="", description="Date of document creation shown on the document")
    additional_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Any other useful extracted data not covered by the main schema"
    )


class UtilityBillData(ProofOfAddressBase):
    account_holder_name: str = Field(default="", description="Name of person or business billed")
    service_address: str = Field(default="", description="The service address shown on the bill")
    billing_period: str = Field(default="", description="Billing period shown on the bill")
    issue_date: str = Field(default="", description="Bill issue date")
    due_date: str = Field(default="", description="Payment due date")
    amount_due: Optional[float] = Field(default=None, description="Amount due on the bill")
    account_number: str = Field(default="", description="Utility account number")


class LeaseParty(BaseModel):
    name: str = Field(default="", description="Party name")
    address: str = Field(default="", description="Party address if shown")


class TenancyAgreementData(ProofOfAddressBase):
    tenant: LeaseParty = Field(default_factory=LeaseParty, description="Tenant details")
    landlord: LeaseParty = Field(default_factory=LeaseParty, description="Landlord details")
    leased_premises_address: str = Field(default="", description="Address of leased premises")
    tenancy_start_date: str = Field(default="", description="Start date of tenancy")
    tenancy_end_date: str = Field(default="", description="End date of tenancy")


class OfficeLeaseData(ProofOfAddressBase):
    tenant: LeaseParty = Field(default_factory=LeaseParty, description="Tenant business details")
    lessor: LeaseParty = Field(default_factory=LeaseParty, description="Lessor / landlord details")
    leased_office_address: str = Field(default="", description="Office address being leased")
    lease_start_date: str = Field(default="", description="Lease start date")
    lease_end_date: str = Field(default="", description="Lease end date")


class LPAgreementData(BaseModel):
    partnership_name: str = Field(default="", description="Name of the limited partnership")
    general_partners: List[str] = Field(default_factory=list, description="Names of general partners")
    limited_partners: List[str] = Field(default_factory=list, description="Names of limited partners")
    agreement_date: str = Field(default="", description="Date of LP agreement")
    registered_address: str = Field(default="", description="Registered/business address")
    business_purpose: str = Field(default="", description="Nature/purpose of business")
    capital_contributions: List[Dict[str, Any]] = Field(default_factory=list, description="Partner contributions")
    duration_or_term: str = Field(default="", description="Term/duration if specified")
    signing_parties: List[str] = Field(default_factory=list, description="Agreement signatories")
    additional_data: Dict[str, Any] = Field(default_factory=dict)


class LLPResolutionData(BaseModel):
    llp_name: str = Field(default="", description="Name of the LLP")
    registered_address: str = Field(default="", description="Registered/business address")
    resolution_date: str = Field(default="", description="Date of resolution")
    resolution_title: str = Field(default="", description="Title/subject of the resolution")
    resolution_summary: str = Field(default="", description="Short summary of the resolved matter")
    designated_partners: List[str] = Field(default_factory=list, description="Names of designated partners")
    authorised_signatories: List[str] = Field(default_factory=list, description="Names of authorised signatories")
    effective_date: str = Field(default="", description="Effective date if specified")
    additional_data: Dict[str, Any] = Field(default_factory=dict)


class BoardResolutionData(BaseModel):
    company_name: str = Field(default="", description="Name of the private limited company")
    resolution_date: str = Field(default="", description="Date of the board resolution")
    resolution_title: str = Field(default="", description="Title/subject of the board resolution")
    resolution_summary: str = Field(default="", description="Short summary of what was approved/resolved")
    directors: List[str] = Field(default_factory=list, description="Names of directors mentioned")
    authorised_signatories: List[str] = Field(default_factory=list, description="Names of authorised signatories")
    effective_date: str = Field(default="", description="Effective date if specified")
    reference_number: str = Field(default="", description="Board resolution number/reference if present")
    additional_data: Dict[str, Any] = Field(default_factory=dict)


class NPWPCertificateData(BaseModel):
    taxpayer_name: str = Field(default="", description="Registered taxpayer name")
    npwp_number: str = Field(default="", description="NPWP tax number")
    registered_address: str = Field(default="", description="Registered taxpayer address")
    taxpayer_status: str = Field(default="", description="Taxpayer status/category if shown")
    issue_date: str = Field(default="", description="Issue or registration date")
    tax_office_name: str = Field(default="", description="Issuing tax office / KPP")
    additional_data: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("npwp_number")
    @classmethod
    def validate_npwp(cls, v: str) -> str:
        if not v:
            return v
        cleaned = re.sub(r"[^\d]", "", v)
        if cleaned and not re.match(r"^\d{15}$", cleaned):
            raise ValueError(f"Invalid NPWP format: {cleaned}")
        return cleaned


class ShareholderEntry(BaseModel):
    name: str = Field(default="", description="Name of founder/shareholder")
    entity_type: str = Field(default="", description="INDIVIDUAL or COMPANY")
    id_number: str = Field(default="", description="ID number if individual and clearly shown")
    registration_number: str = Field(default="", description="Company/entity registration number if clearly shown")
    address: str = Field(default="", description="Address if clearly shown")
    share_count: Optional[int] = Field(default=None, description="Number of shares subscribed")
    nominal_value_idr: Optional[float] = Field(default=None, description="Nominal subscription amount in IDR")
    ownership_percentage: Optional[float] = Field(
        default=None,
        description="Ownership percentage if explicitly stated or safely derivable",
    )


class AktaPendirianData(BaseModel):
    company_name: str = Field(default="", description="Registered company name stated in the deed")
    legal_entity_type: str = Field(default="", description="Usually Perseroan Terbatas / PT")
    deed_number: str = Field(default="", description="Nomor akta")
    deed_date: str = Field(default="", description="Tanggal akta / deed date")
    notary_name: str = Field(default="", description="Name of notary who executed the deed")
    notary_office_address: str = Field(default="", description="Notary office address if shown")

    domicile_city: str = Field(default="", description="City of domicile / seat of company")
    registered_address: str = Field(default="", description="Registered address if explicitly stated in the deed")
    duration: str = Field(default="", description="Company duration / term")
    business_purpose: str = Field(default="", description="Maksud dan tujuan / main business purpose")
    business_activities: List[str] = Field(default_factory=list, description="Business activity descriptions")
    kbli_codes: List[str] = Field(default_factory=list, description="KBLI codes mentioned in the deed")

    authorized_capital_idr: Optional[float] = Field(default=None, description="Modal dasar")
    authorized_share_count: Optional[int] = Field(default=None, description="Total authorized shares")
    par_value_per_share_idr: Optional[float] = Field(default=None, description="Nominal value per share")
    issued_capital_idr: Optional[float] = Field(default=None, description="Modal ditempatkan if identifiable")
    paid_up_capital_idr: Optional[float] = Field(default=None, description="Modal disetor if identifiable")
    issued_paid_share_count: Optional[int] = Field(default=None, description="Shares issued and/or paid up")

    shareholders: List[ShareholderEntry] = Field(
        default_factory=list,
        description="Founders/shareholders and their subscriptions",
    )
    directors: List[str] = Field(default_factory=list, description="Directors appointed in the deed")
    commissioners: List[str] = Field(default_factory=list, description="Commissioners appointed in the deed")

    representative_parties: List[str] = Field(
        default_factory=list,
        description="Persons appearing before the notary / acting for corporate founders",
    )
    supporting_entity_names: List[str] = Field(
        default_factory=list,
        description="Other entities referenced, e.g. founding shareholder company",
    )
    ministerial_reference_numbers: List[str] = Field(
        default_factory=list,
        description="AHU / ministerial reference numbers mentioned",
    )
    additional_data: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("kbli_codes")
    @classmethod
    def validate_kbli_codes(cls, v: List[str]) -> List[str]:
        cleaned_codes = []
        for code in v:
            digits = re.sub(r"\D", "", code or "")
            if digits:
                cleaned_codes.append(digits)
        return cleaned_codes

    @field_validator("shareholders")
    @classmethod
    def normalize_shareholders(cls, v: List[ShareholderEntry]) -> List[ShareholderEntry]:
        normalized = []
        for item in v:
            if item.entity_type:
                item.entity_type = item.entity_type.strip().upper()
            normalized.append(item)
        return normalized

class UBODeclarationOwner(BaseModel):
    full_name: str = Field(default="", description="Full legal name of the beneficial owner / controlling person")
    nationality: str = Field(default="", description="Nationality or citizenship if shown")
    date_of_birth: str = Field(default="", description="Date of birth if shown")
    id_type: str = Field(default="", description="Type of identification document, e.g. NRIC, Passport")
    id_number: str = Field(default="", description="Identification number if shown")
    residential_address: str = Field(default="", description="Residential address if shown")
    country_of_residence: str = Field(default="", description="Country of residence if shown")
    ownership_percentage: Optional[float] = Field(
        default=None,
        description="Direct or indirect ownership percentage if explicitly stated"
    )
    ownership_type: Optional[str] = Field(
        default="",
        description="DIRECT, INDIRECT, CONTROL, or OTHER if stated or clearly inferable from the declaration"
    )
    control_description: Optional[str] = Field(
        default="",
        description="Short description of control basis, e.g. shares, voting rights, other means"
    )
    politically_exposed_person: Optional[bool] = Field(
        default=None,
        description="Whether the person is declared as a PEP, if explicitly stated"
    )
    pep_details: Optional[str] = Field(default="", description="PEP details if stated")
    sanctions_declared: Optional[bool] = Field(
        default=None,
        description="Whether sanctions/adverse declaration is indicated, if explicitly stated"
    )
    tax_residency: str = Field(default="", description="Tax residency if shown")
    source_of_wealth: str = Field(default="", description="Source of wealth if shown")
    source_of_funds: str = Field(default="", description="Source of funds if shown")


class UBODeclarationData(BaseModel):
    company_name: str = Field(default="", description="Company/entity name the declaration relates to")
    registration_number: str = Field(default="", description="UEN, business registration number, or equivalent if shown")
    declaration_date: str = Field(default="", description="Date of declaration or form completion")
    form_title: str = Field(default="", description="Title of the document/form")
    jurisdiction: str = Field(default="", description="Jurisdiction/country if shown")
    declares_no_ubo: Optional[bool] = Field(
        default=None,
        description="True if the form explicitly states there is no UBO meeting the threshold"
    )
    ubo_threshold_percentage: Optional[float] = Field(
        default=None,
        description="Threshold used in the declaration, e.g. 25"
    )
    beneficial_owners: List[UBODeclarationOwner] = Field(
        default_factory=list,
        description="List of declared ultimate beneficial owners / controlling persons"
    )
    declarant_name: str = Field(default="", description="Name of the person signing/completing the declaration")
    declarant_role: str = Field(default="", description="Role/capacity of the declarant, e.g. Director, Authorised Signatory")
    signature_date: str = Field(default="", description="Date of signature if shown")
    contact_details: str = Field(default="", description="Email / phone / contact details if shown")
    additional_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Any other relevant declarations, checkboxes, certifications, or notes"
    )
    
class UnknownDocumentData(BaseModel):
    best_guess_document_type: str = Field(
        default="",
        description="Best-effort guess of what the unknown document is, e.g. INVOICE, PAYSLIP, TAX_INVOICE, RECEIPT, else OTHERS"
    )
    display_label: str = Field(
        default="Unsupported Document",
        description="Frontend-friendly label to show users"
    )


DOCUMENT_SCHEMA_REGISTRY: Dict[str, Type[BaseModel]] = {
    "NIB": NIBExtractionData,
    "BANK_STATEMENT": BankStatementData,
    "ACRA": ACRAExtractionData,
    "UTILITY_BILL": UtilityBillData,
    "TENANCY_AGREEMENT": TenancyAgreementData,
    "OFFICE_LEASE": OfficeLeaseData,
    "LP_AGREEMENT": LPAgreementData,
    "LLP_RESOLUTION": LLPResolutionData,
    "BOARD_RESOLUTION": BoardResolutionData,
    "NPWP_CERTIFICATE": NPWPCertificateData,
    "AKTA_PENDIRIAN": AktaPendirianData,
    "UBO_DECLARATION": UBODeclarationData,
    "UNKNOWN": UnknownDocumentData
}


SUPPORTED_DOCUMENT_TYPES = list(DOCUMENT_SCHEMA_REGISTRY.keys())