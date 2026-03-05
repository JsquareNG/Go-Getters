# kyb_rules.py

from backend.rules_engine.models import Company
from backend.rules_engine.config import HIGH_RISK_JURISDICTIONS, HIGH_RISK_INDUSTRIES


def evaluate_company(company: Company):
    score = 0
    triggers = []

    if company.country in HIGH_RISK_JURISDICTIONS:
        score += 25
        triggers.append({
            "code": "KYB_HIGH_RISK_COUNTRY",
            "description": "Company operates in a high-risk jurisdiction"
        })

    if company.industry in HIGH_RISK_INDUSTRIES:
        score += 15
        triggers.append({
            "code": "KYB_HIGH_RISK_INDUSTRY",
            "description": f"Company operates in a high-risk industry ({company.industry})"
        })

    if company.ownership_layers > 2:
        score += 20
        triggers.append({
            "code": "KYB_COMPLEX_OWNERSHIP",
            "description": "Company has multiple ownership layers"
        })

    if company.uses_trust_or_nominee:
        score += 30
        triggers.append({
            "code": "KYB_TRUST_NOMINEE",
            "description": "Company uses trust or nominee arrangements"
        })

    if company.expected_monthly_volume > 1_000_000:
        score += 10
        triggers.append({
            "code": "KYB_HIGH_TX_VOLUME",
            "description": "Expected transaction volume is unusually high"
        })

    return score, triggers