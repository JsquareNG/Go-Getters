
from models import Company
from kyb_rules import score_company_risk
from kyc_rules import score_individual_risk
from config import SIMPLIFIED_CDD_THRESHOLD, STANDARD_CDD_THRESHOLD


def determine_due_diligence(company: Company) -> dict:
    total_risk = score_company_risk(company)

    # Immediate EDD triggers
    for person in company.individuals:
        if person.is_pep or person.has_adverse_media:
            return {
                "risk_score": total_risk,
                "decision": "Enhanced Due Diligence (EDD)",
                "reason": "PEP or adverse media detected"
            }

        total_risk += score_individual_risk(person)

    # Risk-based decision
    if total_risk < SIMPLIFIED_CDD_THRESHOLD:
        decision = "Simplified CDD"
    elif total_risk <= STANDARD_CDD_THRESHOLD:
        decision = "Standard CDD"
    else:
        decision = "Enhanced Due Diligence (EDD)"

    return {
        "risk_score": total_risk,
        "decision": decision,
        "reason": "Risk-based assessment"
    }
