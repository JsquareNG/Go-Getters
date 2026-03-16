from sqlalchemy.orm import Session, selectinload, with_loader_criteria
from backend.models.risk_rule import RiskRule
from backend.models.risk_rule_condition import RiskRuleCondition

def load_active_rules_by_category(db: Session, category: str):
    rules = (
        db.query(RiskRule)
        .options(
            selectinload(RiskRule.conditions),
            with_loader_criteria(
                RiskRuleCondition,
                RiskRuleCondition.is_active == True,
                include_aliases=True,
            ),
        )
        .filter(
            RiskRule.category == category,
            RiskRule.is_active == True,
        )
        .order_by(RiskRule.rule_code.asc())
        .all()
    )

    # extra safety: remove rules that ended up with no active conditions
    result = []
    for rule in rules:
        active_conditions = [c for c in rule.conditions if c.is_active]
        if active_conditions:
            rule.conditions = active_conditions
            result.append(rule)

    return result