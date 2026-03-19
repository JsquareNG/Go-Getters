from sqlalchemy.orm import Session
from backend.compliance_rules_engine.process import evaluate_company
from backend.compliance_rules_engine.config_list import load_active_risk_config

def submit_application(company, db:Session):  
    company.business_country = company.country
      
    config = load_active_risk_config(db)
    result = evaluate_company(company, db, config)
    
    return result