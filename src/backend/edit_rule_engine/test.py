from models import Company, Individual
from engine import evaluate_company


def test_indonesia_company():

    director = Individual(
        name="Budi Santoso",
        nationality="Indonesia",
        is_pep=True,
        sanctions_declared=False,
        tax_residency="Indonesia",
        fatca_us_person=False
    )

    company = Company(

        name="PT Crypto Nusantara",
        country="Indonesia",
        entity_type="PT",
        registration_year=2024,
        industry="Cryptocurrency",

        annual_revenue=200000,
        expected_tx_volume=6000000,

        ownership_layers=3,

        transaction_countries=["Singapore", "Indonesia"],

        individuals=[director],

        acra_profile=False,
        address_proof=True,
        bank_statements=True,

        nib_present=False,
        npwp_present=True
    )

    result = evaluate_company(company)

    print(result)