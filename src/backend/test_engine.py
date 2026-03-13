from models import Company, Individual
from rule_engine import evaluate_company

def test_indonesia_sme():
    director = Individual(
        name="Budi Santoso",
        nationality="Indonesia",
        is_pep=False,
        sanctions_declared=False,
        tax_residency="Indonesia",
        fatca_us_person=False
    )
    company = Company(
        name="IndoCrypto",
        entity_type="PT",
        country="Indonesia",
        registration_year=2024,
        industry="Cryptocurrency",
        annual_revenue=500_000,
        expected_tx_volume=6_000_000,
        ownership_layers=3,
        transaction_countries=["Indonesia","Singapore","US"],
        individuals=[director],
        acra_profile=False,
        address_proof=False,
        bank_statements=False,
        nib_present=False,
        npwp_present=True
    )
    result = evaluate_company(company)
    print("Company:", company.name)
    print("Country:", company.country)
    print("Risk Score:", result["risk_score"])
    print("Decision:", result["risk_decision"])

    print("\nTriggered Rules:")

    for r in result["triggered_rules"]:
        print(f"{r['code']} - {r['description']}")

def test_singapore_sme():
    director = Individual(
        name="Tan Wei",
        nationality="Singapore",
        is_pep=True,
        sanctions_declared=False,
        tax_residency="Singapore",
        fatca_us_person=False
    )
    company = Company(
        name="SG FinTech",
        entity_type="PTE_LTD",
        country="Singapore",
        registration_year=2022,
        industry="Online Gaming",
        annual_revenue=1_200_000,
        expected_tx_volume=2_000_000,
        ownership_layers=2,
        transaction_countries=["Singapore","Malaysia"],
        individuals=[director],
        acra_profile=True,
        address_proof=True,
        bank_statements=True,
        nib_present=False,
        npwp_present=False
    )
    result = evaluate_company(company)

    print("Company:", company.name)
    print("Country:", company.country)
    print("Risk Score:", result["risk_score"])
    print("Decision:", result["risk_decision"])

    print("\nTriggered Rules:")

    for r in result["triggered_rules"]:
        print(f"{r['code']} - {r['description']}")

# <-- This is the key part
if __name__ == "__main__":
    print("=== Testing Indonesia SME ===")
    test_indonesia_sme()

    print("\n=== Testing Singapore SME ===")
    test_singapore_sme()