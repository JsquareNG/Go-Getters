from config import (
    HIGH_RISK_COUNTRIES,
    HIGH_RISK_INDUSTRIES,
    HIGH_TX_VOLUME_THRESHOLD,
    FATF_BLACKLIST
)


def evaluate_company(company):

    score = 0
    triggers = []

    if company.country in HIGH_RISK_COUNTRIES:
        score += 25
        triggers.append({
            "code": "R001B",
            "description": "Company registered in high-risk jurisdiction"
        })

    if company.industry in HIGH_RISK_INDUSTRIES:
        score += 20
        triggers.append({
            "code": "R002B",
            "description": "High-risk industry"
        })

    if company.ownership_layers > 2:
        score += 20
        triggers.append({
            "code": "R003B",
            "description": "Complex multi-layer ownership structure"
        })

    if company.trust_structure:
        score += 25
        triggers.append({
            "code": "R004B",
            "description": "Trust or nominee ownership detected"
        })

    if company.expected_volume > HIGH_TX_VOLUME_THRESHOLD:
        score += 15
        triggers.append({
            "code": "R005B",
            "description": "Expected transaction volume unusually high"
        })

    if company.years_incorporated < 1:
        score += 10
        triggers.append({
            "code": "R006B",
            "description": "Newly incorporated company"
        })

    if not company.physical_presence:
        score += 10
        triggers.append({
            "code": "R007B",
            "description": "No verifiable physical business presence"
        })

    if company.cross_border:
        score += 10
        triggers.append({
            "code": "R008B",
            "description": "Significant cross-border transaction exposure"
        })
    if company.country in FATF_BLACKLIST:
        score += 100
        triggers.append({
            "code": "R017",
            "description": "Company linked to FATF blacklisted jurisdiction"
        })

    return score, triggers