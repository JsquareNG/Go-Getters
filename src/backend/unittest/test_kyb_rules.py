import pytest

from backend.rules_engine.kyb_rules import evaluate_company


# -----------------------------
# Mock Company Object
# -----------------------------
class MockCompany:
    def __init__(
        self,
        country="SG",
        industry="tech",
        ownership_layers=1,
        trust_structure=False,
        years_incorporated=5,
        physical_presence=True,
        cross_border=False,
    ):
        self.country = country
        self.industry = industry
        self.ownership_layers = ownership_layers
        self.trust_structure = trust_structure
        self.years_incorporated = years_incorporated
        self.physical_presence = physical_presence
        self.cross_border = cross_border


# -----------------------------
# Fixtures (Mock Config)
# -----------------------------
@pytest.fixture(autouse=True)
def mock_config(monkeypatch):

    monkeypatch.setattr("backend.rules_engine.kyb_rules.HIGH_RISK_COUNTRIES", ["IR"])
    monkeypatch.setattr("backend.rules_engine.kyb_rules.HIGH_RISK_INDUSTRIES", ["crypto"])
    monkeypatch.setattr("backend.rules_engine.kyb_rules.FATF_BLACKLIST", ["KP"])


# -----------------------------
# TESTS
# -----------------------------

def test_clean_company():
    company = MockCompany()

    score, triggers = evaluate_company(company)

    assert score == 0
    assert len(triggers) == 0


def test_high_risk_country():
    company = MockCompany(country="IR")

    score, triggers = evaluate_company(company)

    assert any(t["code"] == "R001B" for t in triggers)
    assert score >= 25


def test_high_risk_industry():
    company = MockCompany(industry="crypto")

    score, triggers = evaluate_company(company)

    assert any(t["code"] == "R002B" for t in triggers)
    assert score >= 20


def test_complex_ownership():
    company = MockCompany(ownership_layers=3)

    score, triggers = evaluate_company(company)

    assert any(t["code"] == "R003B" for t in triggers)
    assert score >= 20


def test_trust_structure():
    company = MockCompany(trust_structure=True)

    score, triggers = evaluate_company(company)

    assert any(t["code"] == "R004B" for t in triggers)
    assert score >= 25


def test_new_company():
    company = MockCompany(years_incorporated=0)

    score, triggers = evaluate_company(company)

    assert any(t["code"] == "R006B" for t in triggers)
    assert score >= 10


def test_no_physical_presence():
    company = MockCompany(physical_presence=False)

    score, triggers = evaluate_company(company)

    assert any(t["code"] == "R007B" for t in triggers)
    assert score >= 10


def test_cross_border():
    company = MockCompany(cross_border=True)

    score, triggers = evaluate_company(company)

    assert any(t["code"] == "R008B" for t in triggers)
    assert score >= 10


def test_fatf_blacklist():
    company = MockCompany(country="KP")

    score, triggers = evaluate_company(company)

    assert any(t["code"] == "R017" for t in triggers)
    assert score >= 100


def test_multiple_risks_combined():
    company = MockCompany(
        country="IR",
        industry="crypto",
        ownership_layers=5,
        trust_structure=True,
        years_incorporated=0,
        physical_presence=False,
        cross_border=True,
    )

    score, triggers = evaluate_company(company)

    codes = {t["code"] for t in triggers}

    expected = {
        "R001B", "R002B", "R003B",
        "R004B", "R006B", "R007B",
        "R008B"
    }

    assert expected.issubset(codes)
    assert "R017" not in codes  # IR is not in FATF blacklist (mock)


def test_trigger_structure():
    company = MockCompany(country="IR")

    _, triggers = evaluate_company(company)

    for t in triggers:
        assert "code" in t
        assert "description" in t
        # KYB rules do not include score field in triggers