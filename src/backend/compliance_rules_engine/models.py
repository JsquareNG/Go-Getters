from dataclasses import dataclass
from typing import List


@dataclass
class Individual:

    name: str
    nationality: str
    is_pep: bool
    sanctions_declared: bool
    tax_residency: bool
    fatca_us_person: bool


@dataclass
class Company:

    name: str
    country: str
    entity_type: str
    registration_year: int
    industry: str

    annual_revenue: float
    expected_tx_volume: float

    ownership_layers: int

    transaction_countries: List[str]

    individuals: List[Individual]

    # documents
    acra_profile: bool
    address_proof: bool
    bank_statements: bool

    # indonesia specific
    nib_present: bool
    npwp_present: bool