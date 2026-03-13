from rule_engine import run_engine


def submit_application(company):

    result = run_engine(company)

    print("\nApplication Result")
    print("----------------------")
    print("Company:", company.name)
    print("Country:", company.country)
    print("Risk Score:", result["risk_score"])
    print("Decision:", result["decision"])

    print("\nTriggered Rules:")

    for r in result["rules_triggered"]:
        print(f"{r['code']} - {r['description']}")