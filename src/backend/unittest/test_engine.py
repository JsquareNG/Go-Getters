import pytest
from unittest.mock import patch

from backend.compliance_rules_engine.models import Company, Individual
from backend.edit_rule_engine.engine import evaluate_company


# -----------------------------
# Helper: Test Company
# -----------------------------
def create_test_company(country="Singapore"):
    return Company(
        name="Test Co",
        country=country,
        entity_type="Private",
        years_incorporated=6,
        industry="Tech",
        annual_revenue=100000,
        expected_tx_volume=50000,
        ownership_layers=1,
        transaction_country_count=1,
        director_count= 1,
        individuals=[
            Individual(
                name="John",
                nationality="SG",
                is_pep=False,
                sanctions_declared=False,
                fatca_us_person=False
            )
        ],
    )


# -----------------------------
# Test 1: Score Aggregation
# -----------------------------
@patch("backend.edit_rule_engine.engine.load_rules")
@patch("backend.edit_rule_engine.engine.evaluate_rules")
def test_score_aggregation(mock_eval_rules, mock_load_rules):

    mock_load_rules.return_value = {}

    company = create_test_company("Singapore")

    mock_eval_rules.side_effect = [
        (10, ["G1"]),
        (20, ["SG1"]),
        (5, ["KYC1"])
    ]

    result = evaluate_company(company)

    assert result["risk_score"] == 35
    assert result["triggered_rules"] == ["G1", "SG1", "KYC1"]


# -----------------------------
# Test 2: Indonesia Path
# -----------------------------
@patch("backend.edit_rule_engine.engine.load_rules")
@patch("backend.edit_rule_engine.engine.evaluate_rules")
def test_indonesia_rules_called(mock_eval_rules, mock_load_rules):

    mock_load_rules.return_value = {}

    company = create_test_company("Indonesia")

    mock_eval_rules.side_effect = [
        (10, []),
        (20, []),
        (5, [])
    ]

    result = evaluate_company(company)

    assert result["risk_score"] == 35


# -----------------------------
# Test 3: Other Country
# -----------------------------
@patch("backend.edit_rule_engine.engine.load_rules")
@patch("backend.edit_rule_engine.engine.evaluate_rules")
def test_other_country_no_rules(mock_eval_rules, mock_load_rules):

    mock_load_rules.return_value = {}

    company = create_test_company("USA")

    mock_eval_rules.side_effect = [
        (10, []),
        (5, [])
    ]

    result = evaluate_company(company)

    assert result["risk_score"] == 15


# -----------------------------
# Test 4: Decision - Simplified
# -----------------------------
@patch("backend.edit_rule_engine.engine.SIMPLIFIED_THRESHOLD", 50)
@patch("backend.edit_rule_engine.engine.STANDARD_THRESHOLD", 100)
@patch("backend.edit_rule_engine.engine.load_rules")
@patch("backend.edit_rule_engine.engine.evaluate_rules")
def test_decision_simplified(mock_eval_rules, mock_load_rules, *_):

    mock_load_rules.return_value = {}

    company = create_test_company()

    mock_eval_rules.side_effect = [
        (10, []),
        (10, []),
        (5, [])
    ]

    result = evaluate_company(company)

    assert result["decision"] == "Simplified CDD"


# -----------------------------
# Test 5: Decision - Standard
# -----------------------------
@patch("backend.edit_rule_engine.engine.SIMPLIFIED_THRESHOLD", 50)
@patch("backend.edit_rule_engine.engine.STANDARD_THRESHOLD", 100)
@patch("backend.edit_rule_engine.engine.load_rules")
@patch("backend.edit_rule_engine.engine.evaluate_rules")
def test_decision_standard(mock_eval_rules, mock_load_rules, *_):

    mock_load_rules.return_value = {}

    company = create_test_company()

    mock_eval_rules.side_effect = [
        (30, []),
        (30, []),
        (10, [])
    ]

    result = evaluate_company(company)

    assert result["decision"] == "Standard CDD"


# -----------------------------
# Test 6: Decision - Enhanced
# -----------------------------
@patch("backend.edit_rule_engine.engine.SIMPLIFIED_THRESHOLD", 50)
@patch("backend.edit_rule_engine.engine.STANDARD_THRESHOLD", 100)
@patch("backend.edit_rule_engine.engine.load_rules")
@patch("backend.edit_rule_engine.engine.evaluate_rules")
def test_decision_enhanced(mock_eval_rules, mock_load_rules, *_):

    mock_load_rules.return_value = {}

    company = create_test_company()

    mock_eval_rules.side_effect = [
        (60, []),
        (60, []),
        (60, [])
    ]

    result = evaluate_company(company)

    assert result["decision"] == "Enhanced Due Diligence"