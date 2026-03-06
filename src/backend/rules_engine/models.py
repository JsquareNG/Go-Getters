from dataclasses import dataclass
from typing import List


@dataclass
class Individual:
    name: str
    nationality: str
    ownership_pct: float
    is_pep: bool
    sanctions_match: bool
    is_signatory: bool
    directorships: int


@dataclass
class Company:
    name: str
    country: str
    industry: str
    ownership_layers: int
    trust_structure: bool
    expected_volume: float
    years_incorporated: int
    physical_presence: bool
    cross_border: bool
    individuals: List[Individual]