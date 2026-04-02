import pytest
from unittest.mock import patch

from backend.compliance_rules_engine.process import evaluate_company
from backend.compliance_rules_engine.models import Company, Individual


# -----------------------------
# Helper: Create Test Company
# -----------------------------
def create_test_company(country="Singapore"):
    return Company(
        name="Test Co",
        country=country,
        entity_type="Private",
        registration_year=2020,
        industry="Tech",
        annual_revenue=100000,
        expected_tx_volume=50000,
        ownership_layers=1,
        transaction_countries=["SG"],
        individuals=[
            Individual(
                name="John Doe",
                nationality="SG",
                is_pep=False,
                sanctions_declared=False,
                tax_residency=True,
                fatca_us_person=False
            )
        ],
        acra_profile=True,
        address_proof=True,
        bank_statements=True,
        nib_present=True,
        npwp_present=True
    )


# -----------------------------
# Test 1: Score Aggregation
# -----------------------------
@patch("backend.compliance_rules_engine.process.evaluate_kyc_rules")
@patch("backend.compliance_rules_engine.process.evaluate_singapore_rules")
@patch("backend.compliance_rules_engine.process.evaluate_general_rules")
def test_score_aggregation(mock_general, mock_sg, mock_kyc):
    company = create_test_company("Singapore")

    mock_general.return_value = {
        "risk_score": 10,
        "triggered_rules": ["G1"]
    }
    mock_sg.return_value = {
        "risk_score": 20,
        "triggered_rules": ["SG1"]
    }
    mock_kyc.return_value = {
        "risk_score": 5,
        "triggered_rules": ["KYC1"]
    }

    config = {
        "thresholds": {
            "Simplified Due Diligence": 50,
            "Standard Due Diligence": 100
        }
    }

    result = evaluate_company(company, db=None, config=config)

    assert result["risk_score"] == 35
    assert result["triggered_rules"] == ["G1", "SG1", "KYC1"]


# -----------------------------
# Test 2: Indonesia Rule Path
# -----------------------------
@patch("backend.compliance_rules_engine.process.evaluate_kyc_rules")
@patch("backend.compliance_rules_engine.process.evaluate_indonesia_rules")
@patch("backend.compliance_rules_engine.process.evaluate_general_rules")
def test_indonesia_rules_called(mock_general, mock_indo, mock_kyc):
    company = create_test_company("Indonesia")

    mock_general.return_value = {"risk_score": 10, "triggered_rules": []}
    mock_indo.return_value = {"risk_score": 20, "triggered_rules": []}
    mock_kyc.return_value = {"risk_score": 5, "triggered_rules": []}

    config = {
        "thresholds": {
            "Simplified Due Diligence": 50,
            "Standard Due Diligence": 100
        }
    }

    result = evaluate_company(company, db=None, config=config)

    assert result["risk_score"] == 35
    mock_indo.assert_called_once()


# -----------------------------
# Test 3: Singapore Rule Path Only
# -----------------------------
@patch("backend.compliance_rules_engine.process.evaluate_kyc_rules")
@patch("backend.compliance_rules_engine.process.evaluate_singapore_rules")
@patch("backend.compliance_rules_engine.process.evaluate_indonesia_rules")
@patch("backend.compliance_rules_engine.process.evaluate_general_rules")
def test_singapore_rules_called_only(mock_general, mock_indo, mock_sg, mock_kyc):
    company = create_test_company("Singapore")

    mock_general.return_value = {"risk_score": 10, "triggered_rules": []}
    mock_sg.return_value = {"risk_score": 20, "triggered_rules": []}
    mock_kyc.return_value = {"risk_score": 5, "triggered_rules": []}

    config = {
        "thresholds": {
            "Simplified Due Diligence": 50,
            "Standard Due Diligence": 100
        }
    }

    evaluate_company(company, db=None, config=config)

    mock_sg.assert_called_once()
    mock_indo.assert_not_called()


# -----------------------------
# Test 4: Decision Logic - SDD
# -----------------------------
@patch("backend.compliance_rules_engine.process.evaluate_kyc_rules")
@patch("backend.compliance_rules_engine.process.evaluate_singapore_rules")
@patch("backend.compliance_rules_engine.process.evaluate_general_rules")
def test_decision_sdd(mock_general, mock_sg, mock_kyc):
    company = create_test_company()

    mock_general.return_value = {"risk_score": 10, "triggered_rules": []}
    mock_sg.return_value = {"risk_score": 10, "triggered_rules": []}
    mock_kyc.return_value = {"risk_score": 5, "triggered_rules": []}

    config = {
        "thresholds": {
            "Simplified Due Diligence": 50,
            "Standard Due Diligence": 100
        }
    }

    result = evaluate_company(company, db=None, config=config)

    assert result["risk_decision"] == "Simplified Due Diligence (SDD)"


# -----------------------------
# Test 5: Decision Logic - CDD
# -----------------------------
@patch("backend.compliance_rules_engine.process.evaluate_kyc_rules")
@patch("backend.compliance_rules_engine.process.evaluate_singapore_rules")
@patch("backend.compliance_rules_engine.process.evaluate_general_rules")
def test_decision_cdd(mock_general, mock_sg, mock_kyc):
    company = create_test_company()

    mock_general.return_value = {"risk_score": 30, "triggered_rules": []}
    mock_sg.return_value = {"risk_score": 30, "triggered_rules": []}
    mock_kyc.return_value = {"risk_score": 10, "triggered_rules": []}

    config = {
        "thresholds": {
            "Simplified Due Diligence": 50,
            "Standard Due Diligence": 100
        }
    }

    result = evaluate_company(company, db=None, config=config)

    assert result["risk_decision"] == "Standard Due Diligence (CDD)"


# -----------------------------
# Test 6: Decision Logic - EDD
# -----------------------------
@patch("backend.compliance_rules_engine.process.evaluate_kyc_rules")
@patch("backend.compliance_rules_engine.process.evaluate_singapore_rules")
@patch("backend.compliance_rules_engine.process.evaluate_general_rules")
def test_decision_edd(mock_general, mock_sg, mock_kyc):
    company = create_test_company()

    mock_general.return_value = {"risk_score": 60, "triggered_rules": []}
    mock_sg.return_value = {"risk_score": 60, "triggered_rules": []}
    mock_kyc.return_value = {"risk_score": 60, "triggered_rules": []}

    config = {
        "thresholds": {
            "Simplified Due Diligence": 50,
            "Standard Due Diligence": 100
        }
    }

    result = evaluate_company(company, db=None, config=config)

    assert result["risk_decision"] == "Enhanced Due Diligence (EDD)"