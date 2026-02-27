# application_service.py

from models import Company
from rule_engine import determine_due_diligence


def submit_application(company: Company):
    print(f"\n📨 SME Application Submitted: {company.name}")

    result = determine_due_diligence(company)

    print("🔍 KYC / KYB Rule Engine Result")
    print(f"Risk Score : {result['risk_score']}")
    print(f"Decision   : {result['decision']}")
    print(f"Reason     : {result['reason']}")

    return result
