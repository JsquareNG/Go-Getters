import pytest
from unittest.mock import MagicMock
from types import SimpleNamespace

from backend.compliance_rules_engine.rule_loader import load_active_rules_by_category


# ==============================
# Helper Factory Functions
# ==============================

def make_condition(is_active=True):
    return SimpleNamespace(is_active=is_active)


def make_rule(rule_code, conditions, is_active=True, category="KYC"):
    return SimpleNamespace(
        rule_code=rule_code,
        conditions=conditions,
        is_active=is_active,
        category=category
    )


def setup_mock_db(return_rules):
    """
    Helper to mock SQLAlchemy query chain:
    db.query().options().filter().order_by().all()
    """
    db = MagicMock()

    db.query.return_value \
        .options.return_value \
        .filter.return_value \
        .order_by.return_value \
        .all.return_value = return_rules

    return db


# ==============================
# Tests
# ==============================

def test_load_active_rules_basic():
    db = setup_mock_db([
        make_rule("R1", [make_condition(True), make_condition(False)]),
        make_rule("R2", [make_condition(True)])
    ])

    result = load_active_rules_by_category(db, "KYC")

    assert len(result) == 2

    # Rule 1 should only keep active condition
    assert len(result[0].conditions) == 1
    assert result[0].conditions[0].is_active is True

    # Rule 2 unchanged
    assert len(result[1].conditions) == 1


def test_remove_rules_with_no_active_conditions():
    db = setup_mock_db([
        make_rule("R1", [make_condition(False), make_condition(False)]),
        make_rule("R2", [make_condition(True)])
    ])

    result = load_active_rules_by_category(db, "KYC")

    assert len(result) == 1
    assert result[0].rule_code == "R2"


def test_no_rules_returned():
    db = setup_mock_db([])

    result = load_active_rules_by_category(db, "KYC")

    assert result == []


def test_all_rules_filtered_out_due_to_conditions():
    db = setup_mock_db([
        make_rule("R1", [make_condition(False)]),
        make_rule("R2", [make_condition(False)])
    ])

    result = load_active_rules_by_category(db, "KYC")

    assert result == []


def test_conditions_are_overwritten_with_active_only():
    cond_active = make_condition(True)
    cond_inactive = make_condition(False)

    db = setup_mock_db([
        make_rule("R1", [cond_active, cond_inactive])
    ])

    result = load_active_rules_by_category(db, "KYC")

    assert len(result[0].conditions) == 1
    assert result[0].conditions[0] == cond_active


def test_multiple_rules_all_valid():
    db = setup_mock_db([
        make_rule("R1", [make_condition(True)]),
        make_rule("R2", [make_condition(True)]),
        make_rule("R3", [make_condition(True)])
    ])

    result = load_active_rules_by_category(db, "KYC")

    assert len(result) == 3


def test_mixed_active_and_inactive_conditions():
    db = setup_mock_db([
        make_rule("R1", [make_condition(True), make_condition(False)]),
        make_rule("R2", [make_condition(False), make_condition(True)]),
        make_rule("R3", [make_condition(False)])
    ])

    result = load_active_rules_by_category(db, "KYC")

    # R3 should be removed
    assert len(result) == 2

    for rule in result:
        for cond in rule.conditions:
            assert cond.is_active is True


def test_query_chain_called():
    db = MagicMock()

    mock_query = db.query.return_value
    mock_options = mock_query.options.return_value
    mock_filter = mock_options.filter.return_value
    mock_order = mock_filter.order_by.return_value

    mock_order.all.return_value = []

    load_active_rules_by_category(db, "KYC")

    db.query.assert_called_once()
    mock_query.options.assert_called()
    mock_options.filter.assert_called()
    mock_filter.order_by.assert_called()
    mock_order.all.assert_called_once()


def test_category_parameter_passed():
    """
    Ensures function runs with different categories (logic still mocked)
    """
    db = setup_mock_db([
        make_rule("R1", [make_condition(True)], category="AML"),
    ])

    result = load_active_rules_by_category(db, "AML")

    assert len(result) == 1
    assert result[0].rule_code == "R1"