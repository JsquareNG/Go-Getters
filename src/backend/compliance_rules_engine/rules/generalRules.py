from backend.compliance_rules_engine.rule_loader import load_active_rules_by_category
from backend.compliance_rules_engine.db_rule_evaluator import evaluate_db_rules_with_trace

def evaluate_general_rules(company, db, config):
    gen_rules = load_active_rules_by_category(db, "GENERAL")
    return evaluate_db_rules_with_trace(company, gen_rules, config)