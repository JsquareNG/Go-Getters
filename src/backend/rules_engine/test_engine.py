from models import Company, Individual
from application_service import submit_application


ubo = Individual(
    name="John Doe",
    nationality="CountryX",
    ownership_pct=60,
    is_pep=False,
    is_signatory=True,
    directorships=7
)

company = Company(
    name="Global Trading Pte Ltd",
    country="Singapore",
    industry="Crypto",
    ownership_layers=4,
    trust_structure=True,
    expected_volume=5000000,
    years_incorporated=0,
    physical_presence=False,
    cross_border=True,
    individuals=[ubo]
)

submit_application(company)