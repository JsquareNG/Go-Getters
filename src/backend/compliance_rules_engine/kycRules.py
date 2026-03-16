from backend.compliance_rules_engine.rule_loader import load_active_rules_by_category
from backend.compliance_rules_engine.db_rule_evaluator import evaluate_db_rules_with_trace

def evaluate_kyc_rules(individual,db, config):
    kyc_rules = load_active_rules_by_category(db, "KYC")
    return evaluate_db_rules_with_trace(individual, kyc_rules, config)