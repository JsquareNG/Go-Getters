import pytest

from backend.rules_engine.singapore_rules import evaluate_singapore_rules


# -----------------------------
# Mock Company Object
# -----------------------------
class MockCompany:
    def __init__(
        self,
        entity_type="PTE_LTD",
        acra_profile=True,
        address_proof=True,
    ):
        self.entity_type = entity_type
        self.acra_profile = acra_profile
        self.address_proof = address_proof


# -----------------------------
# TESTS
# -----------------------------

def test_valid_company():
    company = MockCompany()

    score, triggers = evaluate_singapore_rules(company)

    assert score == 0
    assert len(triggers) == 0


def test_unsupported_entity_type():
    company = MockCompany(entity_type="UNKNOWN")

    score, triggers = evaluate_singapore_rules(company)

    assert any(t["code"] == "SG001" for t in triggers)
    assert score >= 20


def test_missing_acra_profile():
    company = MockCompany(acra_profile=False)

    score, triggers = evaluate_singapore_rules(company)

    assert any(t["code"] == "SG002" for t in triggers)
    assert score >= 30


def test_missing_address_proof():
    company = MockCompany(address_proof=False)

    score, triggers = evaluate_singapore_rules(company)

    assert any(t["code"] == "SG003" for t in triggers)
    assert score >= 20


def test_all_risks_triggered():
    company = MockCompany(
        entity_type="UNKNOWN",
        acra_profile=False,
        address_proof=False
    )

    score, triggers = evaluate_singapore_rules(company)

    codes = {t["code"] for t in triggers}

    expected = {"SG001", "SG002", "SG003"}

    assert expected.issubset(codes)
    assert score == 70  # 20 + 30 + 20


def test_trigger_structure():
    company = MockCompany(entity_type="UNKNOWN")

    _, triggers = evaluate_singapore_rules(company)

    for t in triggers:
        assert "code" in t
        assert "description" in t
        assert "score" in t
        assert isinstance(t["score"], int)


def test_valid_entity_types():
    """Ensure supported entity types do NOT trigger SG001"""
    for entity in ["PTE_LTD", "LLP", "SOLE_PROPRIETORSHIP"]:
        company = MockCompany(entity_type=entity)

        _, triggers = evaluate_singapore_rules(company)

        assert all(t["code"] != "SG001" for t in triggers)


def test_edge_case_none_values():
    """Handle None inputs gracefully"""
    company = MockCompany(
        entity_type=None,
        acra_profile=None,
        address_proof=None
    )

    score, triggers = evaluate_singapore_rules(company)

    # None should behave as invalid / missing
    assert any(t["code"] == "SG001" for t in triggers)
    assert any(t["code"] == "SG002" for t in triggers)
    assert any(t["code"] == "SG003" for t in triggers)
    assert score >= 70