# rule_engine.py

from models import Company
from kyb_rules import evaluate_company
from kyc_rules import evaluate_individual
from config import SIMPLIFIED_CDD_THRESHOLD, STANDARD_CDD_THRESHOLD


def determine_due_diligence(company: Company):
    total_score = 0
    triggered_checks = []

    # KYB evaluation
    kyb_score, kyb_triggers = evaluate_company(company)
    total_score += kyb_score
    triggered_checks.extend(kyb_triggers)

    # KYC evaluation
    for person in company.individuals:
        # Sanctions = immediate EDD
        if person.sanctions_match:
            triggered_checks.append({
                "code": "IMMEDIATE_EDD_SANCTIONS",
                "description": f"Sanctions match detected for {person.name}"
            })
            return {
                "risk_score": total_score,
                "decision": "Enhanced Due Diligence (EDD)",
                "triggered_checks": triggered_checks
            }

        kyc_score, kyc_triggers = evaluate_individual(person)
        total_score += kyc_score
        triggered_checks.extend(kyc_triggers)

    # Risk-based decision
    if total_score < SIMPLIFIED_CDD_THRESHOLD:
        decision = "Simplified CDD"
    elif total_score <= STANDARD_CDD_THRESHOLD:
        decision = "Standard CDD"
    else:
        decision = "Enhanced Due Diligence (EDD)"

    return {
        "risk_score": total_score,
        "decision": decision,
        "triggered_checks": triggered_checks
    }