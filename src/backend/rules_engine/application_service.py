from backend.rules_engine.rule_engine import evaluate_company

def submit_application(company):

    result = evaluate_company(company)
    print("Company:", company.name)
    print("Country:", company.country)
    print("Risk Score:", result["risk_score"])
    print("Decision:", result["risk_decision"])

    print("\nTriggered Rules:")

    for r in result["triggered_rules"]:
        print(f"{r['code']} - {r['description']}")

    return result