# test_engine.py

from models import Individual, Company
from application_service import submit_application


def test_high_risk_sme():
    ubo = Individual(
        name="John Doe",
        nationality="CountryX",
        ownership_pct=60,
        is_pep=False,
        has_adverse_media=False
    )

    director = Individual(
        name="Jane Tan",
        nationality="Singapore",
        ownership_pct=10,
        is_pep=False,
        has_adverse_media=False
    )

    company = Company(
        name="ABC Fintech Pte Ltd",
        country="Singapore",
        industry="Crypto",
        ownership_layers=3,
        uses_trust_or_nominee=True,
        expected_monthly_volume=5_000_000,
        individuals=[ubo, director]
    )

    submit_application(company)


def test_low_risk_sme():
    owner = Individual(
        name="Ah Beng",
        nationality="Singapore",
        ownership_pct=100,
        is_pep=False,
        has_adverse_media=False
    )

    company = Company(
        name="Happy Kopitiam Pte Ltd",
        country="Singapore",
        industry="F&B",
        ownership_layers=1,
        uses_trust_or_nominee=False,
        expected_monthly_volume=50_000,
        individuals=[owner]
    )

    submit_application(company)


if __name__ == "__main__":
    print("\n=== TEST 1: High-Risk SME ===")
    test_high_risk_sme()

    print("\n=== TEST 2: Low-Risk SME ===")
    test_low_risk_sme()
