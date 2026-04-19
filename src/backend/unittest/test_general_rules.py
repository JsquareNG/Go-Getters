import pytest
from datetime import datetime

from backend.rules_engine.general_rules import evaluate_general_rules


class MockCompany:
    def __init__(
        self,
        country="SG",
        industry="tech",
        registration_year=2020,
        expected_tx_volume=10000,
        ownership_layers=1,
        individuals=None,
        transaction_countries=None,
    ):
        self.country = country
        self.industry = industry
        self.registration_year = registration_year
        self.expected_tx_volume = expected_tx_volume
        self.ownership_layers = ownership_layers
        self.individuals = individuals or []
        self.transaction_countries = transaction_countries or []


@pytest.fixture(autouse=True)
def mock_all(monkeypatch):

    monkeypatch.setattr("backend.rules_engine.general_rules.FATF_BLACKLIST", ["IR"])
    monkeypatch.setattr("backend.rules_engine.general_rules.HIGH_RISK_COUNTRIES", ["PK"])
    monkeypatch.setattr("backend.rules_engine.general_rules.HIGH_RISK_INDUSTRIES", ["crypto"])

    monkeypatch.setattr("backend.rules_engine.general_rules.COMPANY_AGE_RISK_TABLE", [
        (0, 1, 50),
        (2, 5, 20),
    ])

    monkeypatch.setattr("backend.rules_engine.general_rules.TX_VOLUME_RISK_TABLE", [
        (0, 5000, 10),
        (5001, 20000, 20),
    ])

    monkeypatch.setattr("backend.rules_engine.general_rules.OWNERSHIP_LAYER_RISK_TABLE", [
        (1, 2, 5),
        (3, 10, 30),
    ])

    monkeypatch.setattr("backend.rules_engine.general_rules.DIRECTOR_COUNT_RISK_TABLE", [
        (1, 2, 5),
        (3, 10, 15),
    ])

    monkeypatch.setattr("backend.rules_engine.general_rules.TRANSACTION_COUNTRY_COUNT_TABLE", [
        (1, 2, 5),
        (3, 10, 25),
    ])

    def fake_range_score(value, table):
        for min_v, max_v, score in table:
            if min_v <= value <= max_v:
                return score
        return 0

    monkeypatch.setattr(
        "backend.rules_engine.general_rules.calculate_range_score",
        fake_range_score
    )



def test_empty_company():
    company = MockCompany(
        country="SG",
        industry="tech",
        registration_year=2010,
        expected_tx_volume=0,
        ownership_layers=0,
        individuals=[],
        transaction_countries=[]
    )

    score, triggers = evaluate_general_rules(company)

    assert score >= 0
    assert isinstance(triggers, list)


def test_fatf_overrides_grey_list():
    company = MockCompany(country="IR")

    score, triggers = evaluate_general_rules(company)

    codes = [t["code"] for t in triggers]

    assert "R001" in codes
    assert "R002" not in codes


def test_boundary_age_lower():
    current_year = datetime.now().year
    company = MockCompany(registration_year=current_year)

    score, triggers = evaluate_general_rules(company)

    assert any(t["code"] == "R100" for t in triggers)


def test_boundary_age_upper():
    current_year = datetime.now().year
    company = MockCompany(registration_year=current_year - 1)

    score, triggers = evaluate_general_rules(company)

    assert any(t["code"] == "R100" for t in triggers)


def test_zero_transaction_volume():
    company = MockCompany(expected_tx_volume=0)

    score, triggers = evaluate_general_rules(company)

    assert any(t["code"] == "R200" for t in triggers)


def test_negative_transaction_volume():
    company = MockCompany(expected_tx_volume=-100)

    score, triggers = evaluate_general_rules(company)

    assert score >= 0


def test_zero_ownership_layers():
    company = MockCompany(ownership_layers=0)

    score, triggers = evaluate_general_rules(company)

    assert isinstance(score, int)


def test_large_ownership_layers():
    company = MockCompany(ownership_layers=5)  

    score, triggers = evaluate_general_rules(company)

    assert any(t["code"] == "R300" for t in triggers)


def test_no_directors():
    company = MockCompany(individuals=[])

    score, triggers = evaluate_general_rules(company)

    assert isinstance(score, int)


def test_many_directors():
    company = MockCompany(individuals=list(range(5))) 

    score, triggers = evaluate_general_rules(company)

    assert any(t["code"] == "R301" for t in triggers)


def test_no_transaction_countries():
    company = MockCompany(transaction_countries=[])

    score, triggers = evaluate_general_rules(company)

    assert isinstance(score, int)


def test_many_transaction_countries():
    company = MockCompany(
        transaction_countries=["SG", "US", "UK", "CN", "IN"]
    )

    score, triggers = evaluate_general_rules(company)

    assert any(t["code"] == "R400" for t in triggers)

def test_ownership_out_of_range():
    company = MockCompany(ownership_layers=1000)

    score, triggers = evaluate_general_rules(company)

    assert all(t["code"] != "R300" for t in triggers)


def test_directors_out_of_range():
    company = MockCompany(individuals=list(range(1000)))

    score, triggers = evaluate_general_rules(company)

    assert all(t["code"] != "R301" for t in triggers)


def test_all_rules_triggered():
    current_year = datetime.now().year

    company = MockCompany(
        country="IR",
        industry="crypto",
        registration_year=current_year,
        expected_tx_volume=15000,
        ownership_layers=5,
        individuals=list(range(5)),
        transaction_countries=["SG", "US", "UK", "CN"]
    )

    score, triggers = evaluate_general_rules(company)

    codes = {t["code"] for t in triggers}

    expected = {"R001", "R003", "R100", "R200", "R300", "R301", "R400"}

    assert expected.issubset(codes)
    assert score > 0


def test_trigger_structure():
    company = MockCompany(country="IR")

    _, triggers = evaluate_general_rules(company)

    for t in triggers:
        assert "code" in t
        assert "description" in t
        assert "score" in t
        assert isinstance(t["score"], int)