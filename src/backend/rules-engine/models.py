from enum import Enum
from pydantic import BaseModel,Field
from datetime import datetime,timezone
from typing import Optional
from dataclasses import dataclass
from typing import List

class UserRole(str, Enum):
    SME = "SME"
    STAFF = "STAFF"


class ApplicationStatus(str, Enum):
    DRAFT = "DRAFT"
    UNDER_REVIEW = "UNDER REVIEW"
    UNDER_MANUAL_REVIEW = "UNDER MANUAL REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"
    REQUIRES_ACTION = "REQUIRES ACTION"

class User(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    email: str
    role: UserRole

class Application(BaseModel):
    application_id: int
    business_name: str
    business_country: str
    status: ApplicationStatus
    user_id: int
    reviewer_id: Optional[int] = None
    reason: Optional[str] = None
    last_updated: Optional[datetime] = None

#below is for KYC and KYB

@dataclass
class Individual:
    name: str
    nationality: str
    ownership_pct: float
    is_pep: bool
    sanctions_match: bool


@dataclass
class Company:
    name: str
    country: str
    industry: str
    ownership_layers: int
    uses_trust_or_nominee: bool
    expected_monthly_volume: float
    individuals: List[Individual]