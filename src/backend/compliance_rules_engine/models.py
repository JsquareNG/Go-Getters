from dataclasses import dataclass
from typing import List


@dataclass
class Individual:

    name: str
    nationality: str
    is_pep: bool
    sanctions_declared: bool
    fatca_us_person: bool


@dataclass
class Company:

    name: str
    country: str
    entity_type: str
    years_incorporated: int
    industry: str

    annual_revenue: float
    expected_tx_volume: float

    ownership_layers: int

    transaction_country_count: int

    individuals: List[Individual]

    director_count: int
