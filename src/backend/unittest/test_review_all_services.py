import pytest
from unittest.mock import patch, MagicMock

from backend.compliance_rules_engine.review_all_service import (
    _safe_bool_yes,
    _safe_float,
    _calculate_years_incorporated,
    build_company_from_form,
    run_simulation_review,
)


# ==============================
# Helper Function Tests
# ==============================

def test_safe_bool_yes():
    assert _safe_bool_yes("yes") is True
    assert _safe_bool_yes("YES") is True
    assert _safe_bool_yes(" Yes ") is True
    assert _safe_bool_yes("no") is False
    assert _safe_bool_yes(None) is False


def test_safe_float():
    assert _safe_float("100") == 100.0
    assert _safe_float(50) == 50.0
    assert _safe_float("invalid", 10) == 10
    assert _safe_float(None, 5) == 5


# ==============================
# Years Calculation Tests
# ==============================

def test_calculate_years_incorporated_valid():
    result = _calculate_years_incorporated("2020-01-01")
    assert isinstance(result, int)
    assert result >= 0


def test_calculate_years_incorporated_invalid():
    assert _calculate_years_incorporated("invalid-date") == 1


def test_calculate_years_incorporated_none():
    assert _calculate_years_incorporated(None) == 1


# ==============================
# build_company_from_form Tests
# ==============================

def test_build_company_basic():
    form = {
        "businessName": "ABC Ltd",
        "country": "SG",
        "businessIndustry": "Tech",
        "businessType": "Private",
        "expectedMonthlyTransactionVolume": "1000",
        "registrationDate": "2020-01-01",
        "individuals": [
            {"fullName": "John Doe", "nationality": "SG"}
        ],
        "expectedCountriesOfTransactionActivity": ["SG", "US"],
    }

    company = build_company_from_form(form)

    assert company.name == "ABC Ltd"
    assert company.country == "SG"
    assert company.industry == "Tech"
    assert company.entity_type == "Private"
    assert company.expected_tx_volume == 1000.0
    assert isinstance(company.years_incorporated, int)
    assert len(company.individuals) == 1
    assert company.transaction_country_count  == 2


def test_build_company_individuals_dict():
    form = {
        "businessName": "ABC Ltd",
        "individuals": {"fullName": "John Doe", "nationality": "SG"}
    }

    company = build_company_from_form(form)

    assert len(company.individuals) == 1


def test_build_company_individuals_none():
    form = {
        "businessName": "ABC Ltd",
        "individuals": None
    }

    company = build_company_from_form(form)

    assert company.individuals == []


def test_build_company_invalid_individuals_type():
    form = {
        "businessName": "ABC Ltd",
        "individuals": "INVALID"
    }

    with pytest.raises(ValueError):
        build_company_from_form(form)


def test_build_company_defaults():
    form = {}

    company = build_company_from_form(form)

    assert company.name is None
    assert company.transaction_country_count == 0
    assert company.ownership_layers == 1
    assert company.expected_tx_volume == 0


# ==============================
# run_simulation_review Tests
# ==============================

@patch("backend.compliance_rules_engine.review_all_service.submit_application")
def test_run_simulation_review_success(mock_submit):
    mock_submit.return_value = {
        "risk_score": 50,
        "risk_decision": "HIGH",
        "triggered_rules": [{"code": "R1"}],
    }

    records = [
        {
            "application_id": "APP-001",
            "form_data": {
                "businessName": "ABC Ltd",
                "country": "SG",
                "businessType": "Private"
            }
        }
    ]

    db = MagicMock()

    results = run_simulation_review(records, db)

    assert len(results) == 1
    result = results[0]

    assert result["success"] is True
    assert result["application_id"] == "APP-001"
    assert result["business_name"] == "ABC Ltd"
    assert result["country"] == "SG"
    assert result["risk_score"] == 50
    assert result["risk_decision"] == "HIGH"
    assert result["triggered_rules"] == [{"code": "R1"}]
    assert "raw_result" in result


@patch("backend.compliance_rules_engine.review_all_service.submit_application")
def test_run_simulation_review_failure(mock_submit):
    mock_submit.side_effect = Exception("Engine failure")

    records = [
        {
            "application_id": "APP-002",
            "form_data": {
                "businessName": "XYZ Ltd",
                "country": "US",
                "businessType": "LLC"
            }
        }
    ]

    db = MagicMock()

    results = run_simulation_review(records, db)

    assert len(results) == 1
    result = results[0]

    assert result["success"] is False
    assert result["application_id"] == "APP-002"
    assert result["business_name"] == "XYZ Ltd"
    assert "error" in result
    assert "Engine failure" in result["error"]


@patch("backend.compliance_rules_engine.review_all_service.submit_application")
def test_run_simulation_multiple_records(mock_submit):
    mock_submit.return_value = {
        "risk_score": 10,
        "risk_decision": "LOW",
        "triggered_rules": []
    }

    records = [
        {"application_id": "APP-1", "form_data": {"businessName": "A"}},
        {"application_id": "APP-2", "form_data": {"businessName": "B"}},
    ]

    db = MagicMock()

    results = run_simulation_review(records, db)

    assert len(results) == 2
    assert all(r["success"] for r in results)


def test_run_simulation_empty():
    db = MagicMock()

    results = run_simulation_review([], db)

    assert results == []