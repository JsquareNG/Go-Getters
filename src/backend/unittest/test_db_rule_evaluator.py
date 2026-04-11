import pytest
from types import SimpleNamespace

from backend.compliance_rules_engine.db_rule_evaluator import (
    get_company_field_value,
    evaluate_condition,
    evaluate_db_rules_with_trace
)


# ==============================
# Helper Factory Functions
# ==============================

def make_condition(**kwargs):
    return SimpleNamespace(
        field_name=kwargs.get("field_name", "field"),
        operator=kwargs.get("operator"),
        value_type=kwargs.get("value_type"),
        string_value=kwargs.get("string_value"),
        numeric_value=kwargs.get("numeric_value"),
        boolean_value=kwargs.get("boolean_value"),
        list_name=kwargs.get("list_name"),
        condition_group=kwargs.get("condition_group", 1),
        order_no=kwargs.get("order_no", 1),
        score=kwargs.get("score", 10),
        trigger_description=kwargs.get("trigger_description", "Triggered"),
    )


def make_rule(rule_code, conditions):
    return SimpleNamespace(
        rule_code=rule_code,
        rule_name=f"Rule {rule_code}",
        description=f"Description {rule_code}",
        conditions=conditions
    )


# ==============================
# Test get_company_field_value
# ==============================

def test_get_company_field_value():
    company = SimpleNamespace(name="ABC Corp", revenue=1000)

    assert get_company_field_value(company, "name") == "ABC Corp"
    assert get_company_field_value(company, "revenue") == 1000
    assert get_company_field_value(company, "missing") is None


# ==============================
# STRING Tests
# ==============================

def test_string_eq():
    cond = make_condition(operator="EQ", value_type="STRING", string_value="ABC")
    assert evaluate_condition("ABC", cond, {}) is True
    assert evaluate_condition("XYZ", cond, {}) is False


def test_string_neq():
    cond = make_condition(operator="NEQ", value_type="STRING", string_value="ABC")
    assert evaluate_condition("XYZ", cond, {}) is True
    assert evaluate_condition("ABC", cond, {}) is False


def test_string_none():
    cond = make_condition(operator="EQ", value_type="STRING", string_value="ABC")
    assert evaluate_condition(None, cond, {}) is False


# ==============================
# NUMBER Tests
# ==============================

@pytest.mark.parametrize("operator,field,compare,expected", [
    ("EQ", 100, 100, True),
    ("NEQ", 100, 200, True),
    ("GT", 200, 100, True),
    ("GTE", 100, 100, True),
    ("LT", 50, 100, True),
    ("LTE", 100, 100, True),
])
def test_number_operations(operator, field, compare, expected):
    cond = make_condition(
        operator=operator,
        value_type="NUMBER",
        numeric_value=compare
    )
    assert evaluate_condition(field, cond, {}) is expected


def test_number_invalid_input():
    cond = make_condition(operator="GT", value_type="NUMBER", numeric_value=100)
    assert evaluate_condition("abc", cond, {}) is False


def test_number_none_compare():
    cond = make_condition(operator="GT", value_type="NUMBER", numeric_value=None)
    assert evaluate_condition(100, cond, {}) is False


# ==============================
# BOOLEAN Tests
# ==============================

def test_boolean_true():
    cond = make_condition(operator="IS_TRUE", value_type="BOOLEAN")
    assert evaluate_condition(True, cond, {}) is True
    assert evaluate_condition(False, cond, {}) is False


def test_boolean_false():
    cond = make_condition(operator="IS_FALSE", value_type="BOOLEAN")
    assert evaluate_condition(False, cond, {}) is True
    assert evaluate_condition(True, cond, {}) is False


# ==============================
# LIST Tests
# ==============================

def test_list_in_single():
    cond = make_condition(operator="IN", value_type="LIST", list_name="countries")
    config = {"lists": {"countries": {"SG", "US"}}}

    assert evaluate_condition("SG", cond, config) is True
    assert evaluate_condition("CN", cond, config) is False


def test_list_not_in_single():
    cond = make_condition(operator="NOT_IN", value_type="LIST", list_name="countries")
    config = {"lists": {"countries": {"SG", "US"}}}

    assert evaluate_condition("CN", cond, config) is True
    assert evaluate_condition("SG", cond, config) is False


def test_list_multiple_values():
    cond = make_condition(operator="IN", value_type="LIST", list_name="countries")
    config = {"lists": {"countries": {"SG", "US"}}}

    assert evaluate_condition(["CN", "SG"], cond, config) is True


# ==============================
# ELSE Operator Test
# ==============================

def test_else_operator():
    cond = make_condition(operator="ELSE", value_type="STRING")
    assert evaluate_condition(None, cond, {}) is True
    assert evaluate_condition("anything", cond, {}) is True


# ==============================
# FULL RULE ENGINE Tests
# ==============================

def test_single_rule_match():
    company = SimpleNamespace(country="SG", revenue=500)

    cond1 = make_condition(
        field_name="country",
        operator="EQ",
        value_type="STRING",
        string_value="SG",
        condition_group=1,
        score=10
    )

    cond2 = make_condition(
        field_name="revenue",
        operator="GT",
        value_type="NUMBER",
        numeric_value=100,
        condition_group=1,
        score=10
    )

    rule = make_rule("R1", [cond1, cond2])

    result = evaluate_db_rules_with_trace(company, [rule], {})

    assert result["risk_score"] == 10
    assert len(result["triggered_rules"]) == 1
    assert result["trace"][0]["matched"] is True


def test_rule_no_match():
    company = SimpleNamespace(country="CN")

    cond = make_condition(
        field_name="country",
        operator="EQ",
        value_type="STRING",
        string_value="SG"
    )

    rule = make_rule("R2", [cond])

    result = evaluate_db_rules_with_trace(company, [rule], {})

    assert result["risk_score"] == 0
    assert len(result["triggered_rules"]) == 0
    assert result["trace"][0]["matched"] is False


def test_group_logic():
    company = SimpleNamespace(country="SG")

    # Group 1 fails
    cond1 = make_condition(
        field_name="country",
        operator="EQ",
        value_type="STRING",
        string_value="US",
        condition_group=1,
        score=5
    )

    # Group 2 passes
    cond2 = make_condition(
        field_name="country",
        operator="EQ",
        value_type="STRING",
        string_value="SG",
        condition_group=2,
        score=20
    )

    rule = make_rule("R3", [cond1, cond2])

    result = evaluate_db_rules_with_trace(company, [rule], {})

    assert result["risk_score"] == 20
    assert result["trace"][0]["matched_group"] == 2


def test_multiple_rules():
    company = SimpleNamespace(country="SG")

    cond1 = make_condition(
        field_name="country",
        operator="EQ",
        value_type="STRING",
        string_value="SG",
        score=10
    )

    cond2 = make_condition(
        field_name="country",
        operator="EQ",
        value_type="STRING",
        string_value="SG",
        score=20
    )

    rule1 = make_rule("R1", [cond1])
    rule2 = make_rule("R2", [cond2])

    result = evaluate_db_rules_with_trace(company, [rule1, rule2], {})

    assert result["risk_score"] == 30
    assert len(result["triggered_rules"]) == 2