from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Type, Any, Optional
import re

class BasicPerson(BaseModel):
    fullName: str = Field(default="", description="Full legal name")
    idNumber: str = Field(default="", description="NRIC / Passport / ID number")
    nationality: str = Field(default="", description="Nationality")
    residentialAddress: str = Field(default="", description="Residential address")
    dateOfBirth: str = Field(default="", description="Date of birth if available")


class LLPManager(BaseModel):
    fullName: str = Field(default="", description="Full legal name")
    idNumber: str = Field(default="", description="NRIC / Passport / ID number")
    nationality: str = Field(default="", description="Nationality")
    residentialAddress: str = Field(default="", description="Residential address")

class ShareholderEntry(BaseModel):
    fullName: str = Field(default="", description="Name of founder/shareholder")
    entityType: str = Field(default="", description="INDIVIDUAL or COMPANY")
    idNumber: str = Field(default="", description="ID number if individual and clearly shown")
    registrationNumber: str = Field(default="", description="Company/entity registration number if clearly shown")
    nationality: str = Field(default="", description="Nationality of shareholder if shown")
    address: str = Field(default="", description="Address of shareholder if clearly shown")
    shareCount: Optional[int] = Field(default=None, description="Number of shares subscribed")
    nominalValueLdr: Optional[float] = Field(default=None, description="Nominal subscription amount in IDR")
    sharePercentage: Optional[float] = Field(
        default=None,
        description="Ownership percentage if explicitly stated or safely derivable",
    )
# 1. ACRA Schema
class ACRAExtractionData(BaseModel):
    businessName: str = Field(description="Registered name of the business")
    uen: str = Field(description="Unique Entity Number")
    entityType: str = Field(description="E.g., SOLE PROPRIETOR, PRIVATE LIMITED")
    registrationDate: str = Field(description="Date of registration")
    registeredAddress: str = Field(description="Registered office address")
    businessIndustry: str = Field(description="Primary activity")
    shareholders: Optional[List[ShareholderEntry]] = Field(default_factory=list, description="List of shareholders shown in the ACRA Business Profile")
    owner: Optional[BasicPerson] = None
    partners: List[BasicPerson] = Field(default_factory=list)
    generalPartners: List[BasicPerson] = Field(default_factory=list)
    limitedPartners: List[BasicPerson] = Field(default_factory=list)
    managers: List[LLPManager] = Field(default_factory=list)
    directors: List[BasicPerson] = Field(default_factory=list)
    shareholders: List[ShareholderEntry] = Field(default_factory=list)

    @field_validator("uen")
    @classmethod
    def validate_uen(cls, v: str) -> str:
        cleaned = re.sub(r"[^A-Z0-9]", "", v.upper())
        if not re.match(r"^[A-Z0-9]{9,10}$", cleaned):
            raise ValueError(f"Invalid UEN format from OCR: {cleaned}")
        return cleaned


# 2. Indonesian NIB Schema
class KBLIDetail(BaseModel):
    kbliCode: str = Field(default="", description="5-digit KBLI code")
    kbliTitle: str = Field(default="", description="English title/description of the KBLI activity")
    businessLocation: str = Field(default="", description="Business location for this activity")
    riskClassification: str = Field(default="", description="Risk classification of the activity")
    activityType: str = Field(default="", description="Activity type if shown")
    businessPermitLegality: str = Field(default="", description="Permit legality / permit status if shown")

    @field_validator("kbliCode")
    @classmethod
    def validate_kbli_code(cls, v: str) -> str:
        if not v:
            return ""
        cleaned = re.sub(r"\D", "", v)
        if cleaned and not re.match(r"^\d{5}$", cleaned):
            raise ValueError(f"Invalid KBLI code: '{v}'. Must be 5 digits.")
        return cleaned


class NIBExtractionData(BaseModel):
    businessName: str = Field(description="Name of the business")
    registrationNumber: str = Field(description="13-digit Nomor Induk Berusaha")
    businessStatus: str = Field(description="Status (e.g., PMA or PMDN)")
    registeredAddress: str = Field(description="Registered address")
    kbliCodes: List[str] = Field(default_factory=list, description="List of 5-digit KBLI codes")

    phone: str = Field(default="", description="Business phone number if present")
    email: str = Field(default="", description="Business email address if present")
    registrationDate: str = Field(default="", description="Issued date in DD-MM-YYYY if safely inferable")
    issuer: str = Field(default="", description="Issuing authority shown on the NIB document")

    businessActivities: List[KBLIDetail] = Field(
        default_factory=list,
        description="Detailed KBLI activity rows shown in the NIB document"
    )

    @field_validator("registrationNumber")
    @classmethod
    def validate_nib(cls, v: str) -> str:
        cleaned = re.sub(r"\D", "", v)
        if not re.match(r"^\d{13}$", cleaned):
            raise ValueError("Invalid NIB format. Must be exactly 13 digits.")
        return cleaned

    @field_validator("kbliCodes")
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


class BankStatementData(BaseModel):
    bankName: str = Field(default="", description="Name of the bank")
    accountHolderName: str = Field(default="", description="Name of the account holder")
    accountNumber: str = Field(default="", description="The bank account number")
    accountHolderAddress: str = Field(default="", description="Address of the account holder")
    accountCurrency: str = Field(default="", description="Currency of the account")
    statementPeriod: str = Field(default="", description="Period of the statement")

    openingBalance: Optional[float] = Field(default=None, description="Balance at start of statement")
    closingBalance: Optional[float] = Field(default=None, description="Balance at end of statement")

    totalInflow: Optional[float] = Field(default=None, description="Total incoming funds during statement period")
    totalOutflow: Optional[float] = Field(default=None, description="Total outgoing funds during statement period")
    netCashflow: Optional[float] = Field(default=None, description="Net cashflow (inflow - outflow)")

    averageBalance: Optional[float] = Field(default=None, description="Average balance during statement period")
    minimumBalance: Optional[float] = Field(default=None, description="Lowest balance recorded")
    maximumBalance: Optional[float] = Field(default=None, description="Highest balance recorded")

    totalTransactions: Optional[int] = Field(default=None, description="Total number of transactions")
    totalCreditTransactions: Optional[int] = Field(default=None, description="Number of incoming transactions")
    totalDebitTransactions: Optional[int] = Field(default=None, description="Number of outgoing transactions")

    largestIncomingTransaction: Optional[float] = Field(default=None, description="Largest incoming transaction")
    largestOutgoingTransaction: Optional[float] = Field(default=None, description="Largest outgoing transaction")

    uniqueCounterparties: Optional[int] = Field(default=None, description="Number of unique transaction counterparties")


class ProofOfAddressBase(BaseModel):
    documentDate: str = Field(default="", description="Date of document creation shown on the document")

class UtilityBillData(ProofOfAddressBase):
    accountHolderName: str = Field(default="", description="Name of person or business billed")
    serviceAddress: str = Field(default="", description="The service address shown on the bill")
    billingPeriod: str = Field(default="", description="Billing period shown on the bill")
    issueDate: str = Field(default="", description="Bill issue date")
    dueDate: str = Field(default="", description="Payment due date")
    amountDue: Optional[float] = Field(default=None, description="Amount due on the bill")
    accountNumber: str = Field(default="", description="Utility account number")


class LeaseParty(BaseModel):
    name: str = Field(default="", description="Party name")
    address: str = Field(default="", description="Party address if shown")


class TenancyAgreementData(ProofOfAddressBase):
    tenant: LeaseParty = Field(default_factory=LeaseParty, description="Tenant details")
    landlord: LeaseParty = Field(default_factory=LeaseParty, description="Landlord details")
    leasedPremisesAddress: str = Field(default="", description="Address of leased premises")
    tenancyStartDate: str = Field(default="", description="Start date of tenancy")
    tenancyEndDate: str = Field(default="", description="End date of tenancy")

class OfficeLeaseData(ProofOfAddressBase):
    tenant: LeaseParty = Field(default_factory=LeaseParty, description="Tenant business details")
    lessor: LeaseParty = Field(default_factory=LeaseParty, description="Lessor / landlord details")
    registeredAddress: str = Field(default="", description="Office address being leased")
    leaseStartDate: str = Field(default="", description="Lease start date")
    leaseEndDate: str = Field(default="", description="Lease end date")


class LPAgreementData(BaseModel):
    businessName: str = Field(default="", description="Name of the limited partnership")
    generalPartners: List[str] = Field(default_factory=list, description="Names of general partners")
    limitedPartners: List[str] = Field(default_factory=list, description="Names of limited partners")
    registrationDate: str = Field(default="", description="Date of LP agreement")
    registeredAddress: str = Field(default="", description="Registered/business address")
    capitalContributions: List[Dict[str, Any]] = Field(default_factory=list, description="Partner contributions")
    durationOrTerm: str = Field(default="", description="Term/duration if specified")
    signingParties: List[str] = Field(default_factory=list, description="Agreement signatories")

class LLPResolutionData(BaseModel):
    businessName: str = Field(default="", description="Name of the LLP")
    registeredAddress: str = Field(default="", description="Registered/business address")
    resolutionDate: str = Field(default="", description="Date of resolution")
    resolutionTitle: str = Field(default="", description="Title/subject of the resolution")
    resolutionSummary: str = Field(default="", description="Short summary of the resolved matter")
    designatedPartners: List[str] = Field(default_factory=list, description="Names of designated partners")
    authorisedSignatories: List[str] = Field(default_factory=list, description="Names of authorised signatories")
    effectiveDate: str = Field(default="", description="Effective date if specified")


class BoardResolutionData(BaseModel):
    businessName: str = Field(default="", description="Name of the private limited company")
    resolutionDate: str = Field(default="", description="Date of the board resolution")
    resolutionTitle: str = Field(default="", description="Title/subject of the board resolution")
    resolutionSummary: str = Field(default="", description="Short summary of what was approved/resolved")
    directors: List[str] = Field(default_factory=list, description="Names of directors mentioned")
    authorisedSignatories: List[str] = Field(default_factory=list, description="Names of authorised signatories")
    effectiveDate: str = Field(default="", description="Effective date if specified")
    referenceNumber: str = Field(default="", description="Board resolution number/reference if present")


class NPWPCertificateData(BaseModel):
    businessName: str = Field(default="", description="Registered taxpayer name")
    npwp: str = Field(default="", description="NPWP tax number")
    registeredAddress: str = Field(default="", description="Registered taxpayer address")
    taxpayerStatus: str = Field(default="", description="Taxpayer status/category if shown")
    registrationDate: str = Field(default="", description="Issue or registration date")
    taxOfficeName: str = Field(default="", description="Issuing tax office / KPP")

    @field_validator("npwp")
    @classmethod
    def validate_npwp(cls, v: str) -> str:
        if not v:
            return v
        cleaned = re.sub(r"[^\d]", "", v)
        if cleaned and not re.match(r"^\d{15}$", cleaned):
            raise ValueError(f"Invalid NPWP format: {cleaned}")
        return cleaned


class ShareholderEntry(BaseModel):
    fullName: str = Field(default="", description="Name of founder/shareholder")
    entityType: str = Field(default="", description="INDIVIDUAL or COMPANY")
    nationality: str = Field(default="", description="Nationality or place of origin of individual")
    idNumber: str = Field(default="", description="ID number if individual and clearly shown")
    registrationNumber: str = Field(default="", description="Company/entity registration number if clearly shown")
    residentialAddress: str = Field(default="", description="Address of shareholder if clearly shown")
    registeredAddress: str = Field(default="", description="Address of individual or corporate entity")
    sharePercentage: Optional[float] = Field(default=0.0, description="Percentage of shares")
    nominalValueIdr: Optional[float] = Field(default=None, description="Nominal subscription amount in IDR")



class AktaPendirianData(BaseModel):
    businessName: str = Field(default="", description="Registered company name stated in the deed")
    entityType: str = Field(default="", description="Usually Perseroan Terbatas / PT")
    registrationNumber: str = Field(default="", description="Nomor akta")
    registrationDate: str = Field(default="", description="Tanggal akta / deed date")
    notaryName: str = Field(default="", description="Name of notary who executed the deed")
    notaryOfficeAddress: str = Field(default="", description="Notary office address if shown")

    domicileCity: str = Field(default="", description="City of domicile / seat of company")
    registeredAddress: str = Field(default="", description="Registered address if explicitly stated in the deed")
    duration: str = Field(default="", description="Company duration / term")
    businessPurpose: str = Field(default="", description="Maksud dan tujuan / main business purpose")
    businessActivities: List[str] = Field(default_factory=list, description="Business activity descriptions")
    kbliCodes: List[str] = Field(default_factory=list, description="KBLI codes mentioned in the deed")

    authorizedCapitalIdr: Optional[float] = Field(default=None, description="Modal dasar")
    authorizedShareCount: Optional[int] = Field(default=None, description="Total authorized shares")
    parValuePerShareIdr: Optional[float] = Field(default=None, description="Nominal value per share")
    issuedCapitalIdr: Optional[float] = Field(default=None, description="Modal ditempatkan if identifiable")
    paidUpCapitalIdr: Optional[float] = Field(default=None, description="Modal disetor if identifiable")
    issuedPaidShareCount: Optional[int] = Field(default=None, description="Shares issued and/or paid up")

    shareholders: List[ShareholderEntry] = Field(
        default_factory=list,
        description="Founders/shareholders and their subscriptions",
    )
    directors: List[str] = Field(default_factory=list, description="Directors appointed in the deed")
    commissioners: List[str] = Field(default_factory=list, description="Commissioners appointed in the deed")

    @field_validator("kbliCodes")
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
    fullName: str = Field(default="", description="Full legal name of the person")
    nationality: str = Field(default="", description="Nationality or citizenship if shown")
    sharePercentage: Optional[float] = Field(default=None, description="Ownership percentage if shown")


class UBODeclarationData(BaseModel):
    businessName: str = Field(default="", description="Company/entity name")
    registrationNumber: str = Field(default="", description="Business registration number / UEN if shown")
    registrationDate: str = Field(default="", description="Declaration date or signature date if shown")
    countryOfIncorporation: str = Field(default="", description="Place/country of incorporation or registration")
    layersOfOwnership: Optional[int] = Field(default=None, description="Maximum number of ownership layers")
    beneficialOwners: List[UBODeclarationOwner] = Field(
        default_factory=list,
        description="List of relevant natural persons/beneficial owners shown in the declaration"
    )

class GenericAdditionalDocumentData(BaseModel):
    requestedDocumentName: str = Field(default="")
    matchedRequestedDocument: bool = Field(default=True)
    detectedDocumentType: str = Field(default="UNKNOWN")
    documentPurposeSummary: str = Field(
        default="",
        description="What this document appears to be used for"
    )

    keyEntities: Dict[str, Any] = Field(
        default_factory=dict,
        description="Core people, company, authority, counterparty, bank, issuer, etc."
    )

    keyIdentifiers: Dict[str, Any] = Field(
        default_factory=dict,
        description="Registration number, tax number, account number, invoice number, reference number, etc."
    )

    importantDates: Dict[str, Any] = Field(
        default_factory=dict,
        description="Issue date, incorporation date, expiry date, agreement date, billing period, etc."
    )

    addresses: Dict[str, Any] = Field(
        default_factory=dict,
        description="Registered address, service address, premises address, mailing address, etc."
    )

    financialInformation: Dict[str, Any] = Field(
        default_factory=dict,
        description="Amounts, balances, capital, invoice totals, rental, payment obligations, etc."
    )

    ownershipAndGovernance: Dict[str, Any] = Field(
        default_factory=dict,
        description="Shareholders, directors, partners, authorised signatories, beneficial owners, etc."
    )

    obligationsAndTerms: Dict[str, Any] = Field(
        default_factory=dict,
        description="Important clauses, term, validity, lease period, payment due date, conditions, etc."
    )

    extractedMappedFields: Dict[str, Any] = Field(
        default_factory=dict,
        description="Optional normalized fields mapped into common business/KYC names when clearly inferable"
    )

    missingOrUnclearItems: List[str] = Field(
        default_factory=list,
        description="Important items that appear missing or unclear"
    )

class IdentityDocumentData(BaseModel):
    documentSubtype: str = Field(
        default="",
        description="Subtype of identity document, e.g. ID_CARD or PASSPORT"
    )
    fullName: str = Field(
        default="",
        description="Full legal name shown on the identity document"
    )
    idNumber: str = Field(
        default="",
        description="Identity number, passport number, or document number shown"
    )
    residentialAddress: str = Field(
        default="",
        description="Residential address shown on the document, if present"
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
    "UNKNOWN": GenericAdditionalDocumentData,
    "ALTERNATIVE_DOCUMENT": GenericAdditionalDocumentData,
    "GENERIC_ADDITIONAL_DOCUMENT": GenericAdditionalDocumentData,
    "ID_DOCUMENT": IdentityDocumentData,
}


SUPPORTED_DOCUMENT_TYPES = list(DOCUMENT_SCHEMA_REGISTRY.keys())