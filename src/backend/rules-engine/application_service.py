# application_service.py

from models import Company
from rule_engine import determine_due_diligence


def submit_application(company: Company):
    print(f"\n📨 Application submitted: {company.name}")

    result = determine_due_diligence(company)

    print(f"🔢 Risk Score: {result['risk_score']}")
    print(f"📌 Decision: {result['decision']}")

    if result["triggered_checks"]:
        print("\n🚩 Triggered Checks:")
        for check in result["triggered_checks"]:
            print(f"- [{check['code']}] {check['description']}")
    else:
        print("\n✅ No risk triggers detected")

    return result