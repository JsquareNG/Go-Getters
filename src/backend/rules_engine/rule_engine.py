# engine.py

from backend.rules_engine.general_rules import evaluate_general_rules
from backend.rules_engine.singapore_rules import evaluate_singapore_rules
from backend.rules_engine.indonesia_rules import evaluate_indonesia_rules
from backend.rules_engine.kyc_rules import evaluate_kyc_rules
from backend.rules_engine.config import SIMPLIFIED_THRESHOLD, STANDARD_THRESHOLD


def evaluate_company(company):

    total_score = 0
    triggered_rules = []

    # --- KYB: general rules ---
    score, rules = evaluate_general_rules(company)
    total_score += score
    triggered_rules.extend(rules)

    # --- KYB: country-specific rules ---
    if company.country == "Singapore":
        score, rules = evaluate_singapore_rules(company)
        total_score += score
        triggered_rules.extend(rules)

    elif company.country == "Indonesia":
        score, rules = evaluate_indonesia_rules(company)
        total_score += score
        triggered_rules.extend(rules)

    # --- KYC: individual rules ---
    for person in company.individuals:
        score, rules = evaluate_kyc_rules(person)
        total_score += score
        triggered_rules.extend(rules)

    # --- Risk Decision Layer ---
    if total_score < SIMPLIFIED_THRESHOLD:
        risk_decision = "Simplified CDD"
    elif total_score < STANDARD_THRESHOLD:
        risk_decision = "Standard CDD"
    else:
        risk_decision = "Enhanced Due Diligence (EDD)"

    return {
        "risk_score": total_score,
        "risk_decision": risk_decision,
        "triggered_rules": triggered_rules
    }