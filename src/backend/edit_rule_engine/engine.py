from pathlib import Path
from backend.edit_rule_engine.rules.rule_loader import load_rules
from backend.edit_rule_engine.rules.rule_executor import evaluate_rules
from backend.edit_rule_engine.config import SIMPLIFIED_THRESHOLD, STANDARD_THRESHOLD

BASE_DIR = Path(__file__).resolve().parent
RULES_DIR = BASE_DIR / "rules_config"

GENERAL_RULES = load_rules(RULES_DIR / "general_rules.json")
SG_RULES = load_rules(RULES_DIR / "singapore_rules.json")
ID_RULES = load_rules(RULES_DIR / "indonesia_rules.json")
KYC_RULES = load_rules(RULES_DIR / "kyc_rules.json")


def evaluate_company(company):

    total_score = 0
    triggered_rules = []

    score, rules = evaluate_rules(company, GENERAL_RULES)
    total_score += score
    triggered_rules.extend(rules)

    if company.country == "Singapore":

        score, rules = evaluate_rules(company, SG_RULES)

    elif company.country == "Indonesia":

        score, rules = evaluate_rules(company, ID_RULES)

    else:
        score, rules = (0, [])

    total_score += score
    triggered_rules.extend(rules)


    for person in company.individuals:

        score, rules = evaluate_rules(person, KYC_RULES)

        total_score += score
        triggered_rules.extend(rules)

    if total_score < SIMPLIFIED_THRESHOLD:

        decision = "Simplified CDD"

    elif total_score < STANDARD_THRESHOLD:

        decision = "Standard CDD"

    else:

        decision = "Enhanced Due Diligence"

    return {
        "risk_score": total_score,
        "decision": decision,
        "triggered_rules": triggered_rules
    }