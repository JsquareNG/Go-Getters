from backend.compliance_rules_engine.generalRules import evaluate_general_rules
from backend.compliance_rules_engine.sgRules import evaluate_singapore_rules
from backend.compliance_rules_engine.indoRules import evaluate_indonesia_rules
from backend.compliance_rules_engine.kycRules import evaluate_kyc_rules

def evaluate_company(company, db, config):
    total_score = 0
    all_triggers = []

    result  = evaluate_general_rules(company, db, config)
    score = result["risk_score"]
    triggers = result["triggered_rules"]
    total_score += score
    all_triggers.extend(triggers)

    if company.country == "Singapore":
        result = evaluate_singapore_rules(company, db, config)
        score = result["risk_score"]
        triggers = result["triggered_rules"]
        total_score += score
        all_triggers.extend(triggers)

    elif company.country == "Indonesia":
        result = evaluate_indonesia_rules(company, db, config)
        score = result["risk_score"]
        triggers = result["triggered_rules"]
        total_score += score
        all_triggers.extend(triggers)

    for person in company.individuals:
        result = evaluate_kyc_rules(person, db, config)
        score = result["risk_score"]
        triggers = result["triggered_rules"]
        total_score += score
        all_triggers.extend(triggers)

    simplified_threshold = config.get("thresholds", {}).get("Simplified Due Diligence")
    standard_threshold = config.get("thresholds", {}).get("Standard Due Diligence")

    if total_score < simplified_threshold:
        decision = "Simplified CDD"
    elif total_score < standard_threshold:
        decision = "Standard CDD"
    else:
        decision = "Enhanced CDD"

    return {
        "risk_score": total_score,
        "risk_decision": decision,
        "triggered_rules": all_triggers,
    }