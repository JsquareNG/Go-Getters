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

    @field_validator('uen')
    @classmethod
    def validate_uen(cls, v: str) -> str:
        # 1. Clean up OCR artifacts (removes spaces, dashes, and weird punctuation)
        cleaned = re.sub(r"[^A-Z0-9]", "", v.upper())
        
        # 2. Relaxed Regex: Just check for 9 or 10 alphanumeric characters.
        # This stops the code from crashing if the UEN starts with a letter or has an OCR typo!
        if not re.match(r"^[A-Z0-9]{9,10}$", cleaned):
            raise ValueError(f"Invalid UEN format from OCR: {cleaned}")
        return cleaned
    
    additional_data: Dict[str, Any] = Field(
        default_factory=dict, 
        description="""
        Extract ALL other information, fields, and tables from the document that are not 
        explicitly requested above. Group them logically (e.g., 'officers', 'activities', 
        'financials'). Use clear, snake_case keys.
        """
    )

# 2. Indonesian NIB Schema
class NIBExtractionData(BaseModel):
    company_name: str = Field(description="Name of the business")
    nib_number: str = Field(description="13-digit Nomor Induk Berusaha")
    company_status: str = Field(description="Status (e.g., PMA or PMDN)")
    address: str = Field(description="Registered address")
    kbli_codes: List[str] = Field(description="List of 5-digit KBLI codes")

    @field_validator('nib_number')
    @classmethod
    def validate_nib(cls, v: str) -> str:
        cleaned = re.sub(r"\D", "", v)
        if not re.match(r"^\d{13}$", cleaned):
            raise ValueError("Invalid NIB format. Must be exactly 13 digits.")
        return cleaned

    @field_validator('kbli_codes')
    @classmethod
    def validate_kbli(cls, v: List[str]) -> List[str]:
        for code in v:
            if not re.match(r"^\d{5}$", code.strip()):
                raise ValueError(f"Invalid KBLI code: '{code}'. Must be 5 digits.")
        return v
    additional_data: Dict[str, Any] = Field(
        default_factory=dict, 
        description="""
        Extract ALL other information, fields, and tables from the document that are not 
        explicitly requested above. Group them logically (e.g., 'officers', 'activities', 
        'financials'). Use clear, snake_case keys.
        """
    )

class BankStatementData(BaseModel):
    # Account Identity
    bank_name: str = Field(default="", description="Name of the bank")
    account_name: str = Field(default="", description="Name of the account holder")
    account_number: str = Field(default="", description="The bank account number")
    account_holder_address: str = Field(defaylt='', description="Address of the account holder")
    account_currency: str = Field(default="", description="Currency of the account")
    statement_period: str = Field(default="", description="Period of the statement")

    # Statement Summary
    opening_balance: Optional[float] = Field(default=None, description="Balance at start of statement")
    closing_balance: Optional[float] = Field(default=None, description="Balance at end of statement")

    # Cashflow Indicators
    total_inflow: Optional[float] = Field(default=None, description="Total incoming funds during statement period")
    total_outflow: Optional[float] = Field(default=None, description="Total outgoing funds during statement period")
    net_cashflow: Optional[float] = Field(default=None, description="Net cashflow (inflow - outflow)")

    # Balance Metrics
    average_balance: Optional[float] = Field(default=None, description="Average balance during statement period")
    minimum_balance: Optional[float] = Field(default=None, description="Lowest balance recorded")
    maximum_balance: Optional[float] = Field(default=None, description="Highest balance recorded")

    # Transaction Volume
    total_transactions: Optional[int] = Field(default=None, description="Total number of transactions")
    total_credit_transactions: Optional[int] = Field(default=None, description="Number of incoming transactions")
    total_debit_transactions: Optional[int] = Field(default=None, description="Number of outgoing transactions")

    # Large Transaction Indicators
    largest_incoming_transaction: Optional[float] = Field(default=None, description="Largest incoming transaction")
    largest_outgoing_transaction: Optional[float] = Field(default=None, description="Largest outgoing transaction")

    # Counterparty Indicators
    unique_counterparties: Optional[int] = Field(default=None, description="Number of unique transaction counterparties")


class ProofOfAddressBase(BaseModel):
    occupant_name: str = Field(default="", description="Person or business name associated with the address")
    service_address: str = Field(default="", description="The address shown on the document")
    issue_date: str = Field(default="", description="Document issue date")
    document_date: str = Field(default="", description="General document date if issue date is unclear")
    provider_or_landlord_name: str = Field(default="", description="Utility provider, landlord, or leasing party")
    reference_number: str = Field(default="", description="Account number, agreement number, or invoice/reference number")
    additional_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Any other useful extracted data not covered by the main schema"
    )

class UtilityBillData(ProofOfAddressBase):
    utility_type: str = Field(default="", description="Type of utility, e.g. electricity, water, gas, internet")
    billing_period: str = Field(default="", description="Billing period shown on the bill")
    due_date: str = Field(default="", description="Payment due date")
    amount_due: Optional[float] = Field(default=None, description="Amount due on the bill")
    account_number: str = Field(default="", description="Utility account number")
    
class TenancyAgreementData(ProofOfAddressBase):
    tenant_name: str = Field(default="", description="Name of tenant")
    landlord_name: str = Field(default="", description="Name of landlord")
    leased_premises_address: str = Field(default="", description="Address of leased premises")
    tenancy_start_date: str = Field(default="", description="Start date of tenancy")
    tenancy_end_date: str = Field(default="", description="End date of tenancy")
    monthly_rent: Optional[float] = Field(default=None, description="Monthly rent amount")
    agreement_number: str = Field(default="", description="Agreement number if present")

class OfficeLeaseData(ProofOfAddressBase):
    tenant_name: str = Field(default="", description="Name of tenant business")
    lessor_name: str = Field(default="", description="Name of lessor/landlord")
    leased_office_address: str = Field(default="", description="Office address being leased")
    lease_start_date: str = Field(default="", description="Lease start date")
    lease_end_date: str = Field(default="", description="Lease end date")
    monthly_rent: Optional[float] = Field(default=None, description="Monthly rent amount")
    unit_number: str = Field(default="", description="Unit number if separately shown")
    agreement_number: str = Field(default="", description="Lease/agreement number if present")

# --- THE REGISTRY ---
# This dictionary links the AI classification string to the correct Pydantic model
DOCUMENT_SCHEMA_REGISTRY: Dict[str, Type[BaseModel]] = {
    "NIB": NIBExtractionData,
    "BANK_STATEMENT": BankStatementData,
    "ACRA": ACRAExtractionData,
    "UTILITY_BILL": UtilityBillData,
    "TENANCY_AGREEMENT": TenancyAgreementData,
    "OFFICE_LEASE": OfficeLeaseData,
}