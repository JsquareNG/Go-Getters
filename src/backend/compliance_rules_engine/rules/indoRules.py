from backend.compliance_rules_engine.rule_loader import load_active_rules_by_category
from backend.compliance_rules_engine.db_rule_evaluator import evaluate_db_rules_with_trace

def evaluate_indonesia_rules(company, db, config):
    indo_rules = load_active_rules_by_category(db, "IND")
    return evaluate_db_rules_with_trace(company, indo_rules, config)