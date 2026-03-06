from kyc_rules import evaluate_individual
from kyb_rules import evaluate_company
from config import SIMPLIFIED_THRESHOLD, STANDARD_THRESHOLD


def run_engine(company):

    total_score = 0
    triggered = []

    score, rules = evaluate_company(company)
    total_score += score
    triggered.extend(rules)

    for person in company.individuals:
        score, rules = evaluate_individual(person)
        total_score += score
        triggered.extend(rules)

    if total_score < SIMPLIFIED_THRESHOLD:
        decision = "Simplified CDD"

    elif total_score <= STANDARD_THRESHOLD:
        decision = "Standard CDD"

    else:
        decision = "Enhanced Due Diligence"

    return {
        "risk_score": total_score,
        "decision": decision,
        "rules_triggered": triggered
    }