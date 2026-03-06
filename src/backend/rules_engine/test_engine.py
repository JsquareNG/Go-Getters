from backend.rules_engine.models import Company, Individual
from backend.rules_engine.application_service import submit_application


# TEST 1 — Low Risk SME (Expected: Simplified CDD)
def test_low_risk_sme():

    owner = Individual(
        name="Tan Wei Ming",
        nationality="Singapore",
        ownership_pct=80,
        is_pep=False,
        sanctions_match=False,
        is_signatory=True,
        directorships=1
    )

    company = Company(
        name="Sunrise Retail Pte Ltd",
        country="Singapore",
        industry="Retail",
        ownership_layers=1,
        trust_structure=False,
        expected_volume=200000,
        years_incorporated=5,
        physical_presence=True,
        cross_border=False,
        individuals=[owner]
    )


    submit_application(company)



# TEST 2 — High Risk SME (Expected: Enhanced Due Diligence)
def test_high_risk_sme():

    ubo = Individual(
        name="John Doe",
        nationality="Iran",  # FATF blacklist
        ownership_pct=60,
        is_pep=False,
        sanctions_match=False,
        is_signatory=True,
        directorships=7
    )

    director = Individual(
        name="Jane Smith",
        nationality="Singapore",
        ownership_pct=10,
        is_pep=False,
        sanctions_match=False,
        is_signatory=True,
        directorships=3
    )

    company = Company(
        name="Global Crypto Trading Ltd",
        country="Singapore",
        industry="Cryptocurrency Exchange",
        ownership_layers=4,
        trust_structure=True,
        expected_volume=12000000,
        years_incorporated=0,
        physical_presence=False,
        cross_border=True,
        individuals=[ubo, director]
    )

    
    submit_application(company)



if __name__ == "__main__":
    test_low_risk_sme()
    test_high_risk_sme()