import pytest

from backend.rules_engine.kyc_rules import evaluate_kyc_rules


# -----------------------------
# Mock Individual Object
# -----------------------------
class MockIndividual:
    def __init__(
        self,
        name="John Doe",
        sanctions_declared=False,
        is_pep=False,
        fatca_us_person=False,
        tax_residency=True,
    ):
        self.name = name
        self.sanctions_declared = sanctions_declared
        self.is_pep = is_pep
        self.fatca_us_person = fatca_us_person
        self.tax_residency = tax_residency


# -----------------------------
# TESTS
# -----------------------------

def test_clean_individual():
    individual = MockIndividual()

    score, triggers = evaluate_kyc_rules(individual)

    assert score == 0
    assert len(triggers) == 0


def test_sanctions_declared():
    individual = MockIndividual(sanctions_declared=True)

    score, triggers = evaluate_kyc_rules(individual)

    assert any(t["code"] == "KYC001" for t in triggers)
    assert score >= 100


def test_pep():
    individual = MockIndividual(is_pep=True)

    score, triggers = evaluate_kyc_rules(individual)

    assert any(t["code"] == "KYC002" for t in triggers)
    assert score >= 50


def test_fatca_us_person():
    individual = MockIndividual(fatca_us_person=True)

    score, triggers = evaluate_kyc_rules(individual)

    assert any(t["code"] == "KYC003" for t in triggers)
    assert score >= 20


def test_missing_tax_residency():
    individual = MockIndividual(tax_residency=False)

    score, triggers = evaluate_kyc_rules(individual)

    assert any(t["code"] == "KYC004" for t in triggers)
    assert score >= 10


def test_all_flags_true():
    individual = MockIndividual(
        name="Alice",
        sanctions_declared=True,
        is_pep=True,
        fatca_us_person=True,
        tax_residency=False
    )

    score, triggers = evaluate_kyc_rules(individual)

    codes = {t["code"] for t in triggers}

    expected = {"KYC001", "KYC002", "KYC003", "KYC004"}

    assert expected.issubset(codes)
    assert score == 180  # 100 + 50 + 20 + 10


def test_trigger_structure():
    individual = MockIndividual(sanctions_declared=True)

    _, triggers = evaluate_kyc_rules(individual)

    for t in triggers:
        assert "code" in t
        assert "description" in t
        assert "score" in t
        assert isinstance(t["score"], int)


def test_partial_risk_combination():
    individual = MockIndividual(
        sanctions_declared=False,
        is_pep=True,
        fatca_us_person=True,
        tax_residency=False
    )

    score, triggers = evaluate_kyc_rules(individual)

    codes = {t["code"] for t in triggers}

    expected = {"KYC002", "KYC003", "KYC004"}

    assert expected.issubset(codes)
    assert score == 80  # 50 + 20 + 10


def test_individual_name_in_trigger():
    individual = MockIndividual(name="Bob Smith", sanctions_declared=True)

    _, triggers = evaluate_kyc_rules(individual)

    assert any("Bob Smith" in t["description"] for t in triggers)