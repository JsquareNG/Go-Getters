# kyc_rules.py

from backend.rules_engine.models import Individual
from backend.rules_engine.config import HIGH_RISK_JURISDICTIONS


def evaluate_individual(person: Individual):
    score = 0
    triggers = []

    if person.nationality in HIGH_RISK_JURISDICTIONS:
        score += 20
        triggers.append({
            "code": "KYC_JURISDICTION_RISK",
            "description": f"{person.name} is from a high-risk jurisdiction"
        })

    if person.is_pep:
        score += 40
        triggers.append({
            "code": "KYC_PEP",
            "description": f"{person.name} is identified as a Politically Exposed Person"
        })

    if person.sanctions_match:
        triggers.append({
            "code": "KYC_SANCTIONS_MATCH",
            "description": f"{person.name} matched a sanctions list"
        })

    return score, triggers