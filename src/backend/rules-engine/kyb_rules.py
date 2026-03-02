from models import Company
from config import HIGH_RISK_JURISDICTIONS, HIGH_RISK_INDUSTRIES

def score_company_risk(company: Company) -> int:
    score = 0

    # Jurisdiction risk
    if company.country in HIGH_RISK_JURISDICTIONS:
        score += 25

    # Industry risk
    if company.industry in HIGH_RISK_INDUSTRIES:
        score += 15

    # Ownership complexity
    if company.ownership_layers > 2:
        score += 20

    if company.uses_trust_or_nominee:
        score += 30

    # Transaction volume risk
    if company.expected_monthly_volume > 1_000_000:
        score += 10

    return score