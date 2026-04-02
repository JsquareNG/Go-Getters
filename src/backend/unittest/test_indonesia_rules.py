import pytest

from backend.rules_engine.indonesia_rules import evaluate_indonesia_rules


# -----------------------------
# Mock Company Object
# -----------------------------
class MockCompany:
    def __init__(self, nib_present=True, npwp_present=True):
        self.nib_present = nib_present
        self.npwp_present = npwp_present


# -----------------------------
# TESTS
# -----------------------------

def test_all_documents_present():
    company = MockCompany(nib_present=True, npwp_present=True)

    score, triggers = evaluate_indonesia_rules(company)

    # Only base score should be applied
    assert score == 20
    assert len(triggers) == 1
    assert triggers[0]["code"] == "ID001"


def test_missing_nib():
    company = MockCompany(nib_present=False, npwp_present=True)

    score, triggers = evaluate_indonesia_rules(company)

    assert score == 60  # 20 + 40
    assert any(t["code"] == "ID002" for t in triggers)
    assert all(t["code"] != "ID003" for t in triggers)


def test_missing_npwp():
    company = MockCompany(nib_present=True, npwp_present=False)

    score, triggers = evaluate_indonesia_rules(company)

    assert score == 50  # 20 + 30
    assert any(t["code"] == "ID003" for t in triggers)
    assert all(t["code"] != "ID002" for t in triggers)


def test_missing_both_documents():
    company = MockCompany(nib_present=False, npwp_present=False)

    score, triggers = evaluate_indonesia_rules(company)

    assert score == 90  # 20 + 40 + 30

    codes = {t["code"] for t in triggers}

    assert "ID001" in codes
    assert "ID002" in codes
    assert "ID003" in codes


def test_trigger_structure():
    """Ensure all triggers follow correct schema"""
    company = MockCompany(nib_present=False, npwp_present=False)

    _, triggers = evaluate_indonesia_rules(company)

    for t in triggers:
        assert "code" in t
        assert "description" in t
        assert "score" in t
        assert isinstance(t["score"], int)


def test_boolean_edge_cases():
    """Handle edge cases like None or invalid inputs"""

    company = MockCompany(nib_present=None, npwp_present=None)

    score, triggers = evaluate_indonesia_rules(company)

    # None should behave like False
    assert any(t["code"] == "ID002" for t in triggers)
    assert any(t["code"] == "ID003" for t in triggers)
    assert score >= 90